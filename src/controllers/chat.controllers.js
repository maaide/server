import { Configuration, OpenAIApi } from "openai"
import Product from '../models/Product.js'
import ChatMessage from '../models/Chat.js'
import Politics from '../models/Politics.js'
import StoreData from '../models/StoreData.js'

export const responseMessage = async (req, res) => {
    try {
        let ultimateMessages
        const message = req.body.message
        const senderId = req.body.senderId
        const messages = await ChatMessage.find({senderId: senderId}).select('-senderId -_id').lean()
        const ultimateMessage = messages.reverse()
        if (ultimateMessage && ultimateMessage.length) {
            ultimateMessages = `${ultimateMessage[0].response}. ${message}`
        } else {
            ultimateMessages = message
        }
        if (ultimateMessage && ultimateMessage.length && ultimateMessage[0].agent) {
            const newMessage = new ChatMessage({senderId: senderId, message: message, agent: true, adminView: false, userView: true})
            await newMessage.save()
            return res.send(newMessage)
        } else {
            const configuration = new Configuration({
                organization: process.env.OPENAI_ORGANIZATION,
                apiKey: process.env.OPENAI_API_KEY,
            })
            const openai = new OpenAIApi(configuration)
            const responseCategorie = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                temperature: 0,
                messages: [
                    {"role": "system", "content": 'Con las siguientes categorias: saludo, productos, envíos, horarios, ubicación, seguridad, garantía, devoluciones, agradecimientos y despidos. Cuales encajan mejor con la siguiente pregunta'},
                    {"role": "user", "content": ultimateMessages}
                ]
            })
            const categories = responseCategorie.data.choices[0].message.content.toLowerCase()
            if (categories.includes('saludo') && !categories.includes('productos')) {
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: '¡Hola! En que te puedo ayudar?', agent: false, adminView: false, userView: true})
                await newMessage.save()
                return res.send(newMessage)
            }
            let information = ''
            if (categories.includes('productos')) {
                const products = await Product.find().select('name stock price beforePrice variations.variation variations.stock category tags -_id').lean()
                const productsString = JSON.stringify(products)
                const regex = new RegExp('"', 'g')
                const filter = productsString.replace(regex, '')
                if (products.length) {
                    information = `${information}. ${filter}`
                }
            }
            if (categories.includes('garantía') || categories.includes('devoluciones')) {
                const politics = await Politics.findOne().select('devolutions -_id').lean()
                if (politics.devolutions) {
                    information = `${information}. ${politics.devolutions}`
                }
            }
            if (categories.includes('envíos')) {
                const politics = await Politics.findOne().select('shipping -_id').lean()
                if (politics.shipping) {
                    information = `${information}. ${politics.shipping}`
                }
            }
            if (categories.includes('horarios') || categories.includes('ubicación')) {
                const storeData = await StoreData.findOne().select('address departament region city schedule -_id').lean()
                if (storeData) {
                    information = `${information}. ${JSON.stringify(storeData)}`
                }
            }
            let structure
            let agent
            if (message.toLowerCase() === 'agente') {
                agent = true
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: '¡Perfecto! En este momento te estamos transfiriendo con un operador, espera unos minutos', agent: agent, adminView: false, userView: true})
                await newMessage.save()
                return res.send(newMessage)
            } else if (categories.includes('agradecimientos') || categories.includes('despidos')) {
                if (ultimateMessage.length > 1) {
                    structure = [
                        {"role": "system", "content": `Eres un asistente llamado Maaibot de la tienda Maaide, responde la pregunta con un maximo de 200 caracteres, la unica informacion que usaras para responder la pregunta es la siguiente: ${information}, para realizar una compra o hablar con un agente, puede llamar a un agente escribiendo "agente" en el chat`},
                        {"role": "user", "content": ultimateMessage[0].message},
                        {"role": "assistant", "content": ultimateMessage[0].response},
                        {"role": "user", "content": message}
                    ]
                    agent = false
                } else {
                    structure = [
                        {"role": "system", "content": `Eres un asistente llamado Maaibot de la tienda Maaide, responde la pregunta con un maximo de 200 caracteres, la unica informacion que usaras para responder la pregunta es la siguiente: ${information}, para realizar una compra o hablar con un agente, puede llamar a un agente escribiendo "agente" en el chat`},
                        {"role": "user", "content": message}
                    ]
                    agent = false
                }
            } else if (information === '') {
                agent = false
                const newMessage = new ChatMessage({senderId: senderId, message: message, response: 'Lo siento, no tengo la información necesaria para responder tu pregunta, puedes ingresar "agente" en el chat para comunicarte con un operador', agent: agent, adminView: false, userView: true})
                await newMessage.save()
                return res.send(newMessage)
            } else if (ultimateMessage.length > 1) {
                structure = [
                    {"role": "system", "content": `Eres un asistente llamado Maaibot de la tienda Maaide, responde la pregunta con un maximo de 200 caracteres, la unica informacion que usaras para responder la pregunta es la siguiente: ${information}, para realizar una compra o hablar con un agente, puede llamar a un agente escribiendo "agente" en el chat`},
                    {"role": "user", "content": ultimateMessage[0].message},
                    {"role": "assistant", "content": ultimateMessage[0].response},
                    {"role": "user", "content": message}
                ]
                agent = false
            } else {
                structure = [
                    {"role": "system", "content": `Eres un asistente llamado Maaibot de la tienda Maaide, responde la pregunta con un maximo de 200 caracteres, la unica informacion que usaras para responder la pregunta es la siguiente: ${information}, para realizar una compra o hablar con un agente, puede llamar a un agente escribiendo "agente" en el chat`},
                    {"role": "user", "content": message}
                ]
                agent = false
            }
            const responseChat = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                temperature: 0,
                messages: structure
            }).catch(error => console.log(error))
            const responseMessage = responseChat.data.choices[0].message.content
            const newMessage = new ChatMessage({senderId: senderId, message: message, response: responseMessage, agent: agent, adminView: false, userView: true})
            await newMessage.save()
            return res.send(newMessage)
        }
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getIds = async (req, res) => {
    try {
        ChatMessage.aggregate([
            {
                $sort: { senderId: 1, _id: -1 }
            },
            {
                $group: {
                    _id: '$senderId',
                    lastDocument: { $first: '$$ROOT' }
                }
            },
            {
                $replaceRoot: { newRoot: '$lastDocument' }
            },
            {
                $match: { agent: true }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]).exec((err, result) => {
            if (err) {
                return res.sendStatus(404)
            }
            const filtered = result.map(({senderId, adminView, createdAt}) => ({senderId, adminView, createdAt}))
            return res.send(filtered)
        })
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const getMessages = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id}).lean()
        return res.send(messages)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const createMessage = async (req, res) => {
    try {
        const newMessage = new ChatMessage({senderId: req.body.senderId, response: req.body.response, agent: req.body.agent})
        await newMessage.save()
        return res.send(newMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewAdminMessage = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.adminView = true
        const saveMessage = await ChatMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}

export const viewUserMessage = async (req, res) => {
    try {
        const messages = await ChatMessage.find({senderId: req.params.id})
        const reverseMessages = messages.reverse()
        const ultimateMessage = reverseMessages[0]
        ultimateMessage.userView = true
        const saveMessage = await ChatMessage.findByIdAndUpdate(ultimateMessage._id, ultimateMessage, { new: true })
        res.send(saveMessage)
    } catch (error) {
        return res.status(500).json({message: error.message})
    }
}