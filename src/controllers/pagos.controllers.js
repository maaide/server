import pkg from 'transbank-sdk'
const { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes, WebpayPlus } = pkg

export const createOrder = async (req, res) => {
    const {buy_order, session_id, amount, return_url} = req.body
    console.log(buy_order, session_id)
    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration))
    const response = await tx.create(buy_order, session_id, amount, return_url)
    res.send(response)
}

export const confirmOrder = async (req, res) => {
    try {
        const {token} = req.body
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration))
        const response = await tx.commit(token)
        res.send(response)
    }
    catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const orderStatus = async (req, res) => {
    const { token } = req.body
    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration))
    const response = await tx.status(token)
    res.send(response)
}