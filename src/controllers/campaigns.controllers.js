import Email from '../models/Email.js'
import cron from 'node-cron'
import { sendEmail } from '../utils/sendEmail.js'
import { formatDateToCron } from '../utils/cronFormat.js'
import Client from '../models/Client.js'

export const createCampaign = async (req, res) => {
    try {
        const { address, affair, summary, title, paragraph, buttonText, url, date } = req.body
        const newCampaign = new Email({ address, affair, summary, title, paragraph, buttonText, url, date: date === undefined ? new Date() : date })
        await newCampaign.save()
        let subscribers = []
        if (address === 'Todos los suscriptores') {
            subscribers = await Client.find().lean()
        }
        if (date === undefined) {
            console.log('bien')
            subscribers.map(subscriber => {
                sendEmail({ address: subscriber.email, affair, title, paragraph, buttonText, url })
            })
        } else {
            const dateFormat = new Date(date)
            const format = formatDateToCron(dateFormat)
            cron.schedule(format, () => {
                subscribers.map(subscriber => {
                    sendEmail({ address: subscriber.email, affair, title, paragraph, buttonText, url })
                })
            })
        }
        return res.send(newCampaign)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}