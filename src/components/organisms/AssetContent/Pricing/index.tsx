import React, { FormEvent, ReactElement, useState } from 'react'
import { Formik } from 'formik'
import { initialValues, validationSchema } from '../../../../models/FormPricing'
import { DDO, Logger } from '@oceanprotocol/lib'
import { usePricing } from '@oceanprotocol/react'
import { PriceOptionsMarket } from '../../../../@types/MetaData'
import Alert from '../../../atoms/Alert'
import styles from './index.module.css'
import FormPricing from './FormPricing'
import { toast } from 'react-toastify'
import Feedback from './Feedback'
import { graphql, useStaticQuery } from 'gatsby'

const query = graphql`
  query PricingQuery {
    content: allFile(filter: { relativePath: { eq: "price.json" } }) {
      edges {
        node {
          childContentJson {
            create {
              empty {
                title
                info
                action
              }
              fixed {
                title
                info
              }
              dynamic {
                title
                info
                tooltips {
                  poolInfo
                  swapFee
                  communityFee
                  marketplaceFee
                }
              }
            }
          }
        }
      }
    }
  }
`

export default function Pricing({ ddo }: { ddo: DDO }): ReactElement {
  // Get content
  const data = useStaticQuery(query)
  const content = data.content.edges[0].node.childContentJson.create

  // View states
  const [showPricing, setShowPricing] = useState(false)
  const [success, setSuccess] = useState<string>()

  const {
    createPricing,
    pricingIsLoading,
    pricingError,
    pricingStepText
  } = usePricing(ddo)

  const hasFeedback = pricingIsLoading || typeof success !== 'undefined'

  async function handleCreatePricing(values: PriceOptionsMarket) {
    try {
      const priceOptions = {
        ...values,
        // swapFee is tricky: to get 0.1% you need to send 0.001 as value
        swapFee: `${values.swapFee / 100}`
      }
      // TODO: check if we need to mint first
      const tx = await createPricing(priceOptions)

      // Pricing failed
      if (!tx || pricingError) {
        toast.error(pricingError || 'Price creation failed.')
        Logger.error(pricingError || 'Price creation failed.')
        return
      }

      // Pricing succeeded
      setSuccess(`🎉 Successfully created a ${values.type} price. 🎉 `)
      Logger.log(`Transaction: ${tx}`)
    } catch (error) {
      toast.error(error.message)
      Logger.error(error.message)
    }
  }

  function handleShowPricingForm(e: FormEvent<HTMLButtonElement>) {
    e.preventDefault()
    setShowPricing(true)
  }

  return (
    <div className={styles.pricing}>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting }) => {
          // move user's focus to top of screen
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })

          // Kick off price creation
          await handleCreatePricing(values)
          setSubmitting(false)
        }}
      >
        {hasFeedback ? (
          <Feedback success={success} pricingStepText={pricingStepText} />
        ) : showPricing ? (
          <FormPricing
            ddo={ddo}
            setShowPricing={setShowPricing}
            content={content}
          />
        ) : (
          <Alert
            state="info"
            title={content.empty.title}
            text={content.empty.info}
            action={{
              name: content.empty.action,
              handleAction: handleShowPricingForm
            }}
          />
        )}
      </Formik>
    </div>
  )
}
