const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
require('dotenv').config()
app.use(cors())
app.use(express.json())
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://mynul:${process.env.PASS}@cluster0.sfcnp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const jontroCollection = client.db('JontroManufacture').collection('tools');
        const BookingCollection = client.db('BookingCollection').collection('Booking');
        app.post('/create-payment-intent', async (req, res) => {
            const serviceChare = req.body;
            const price = serviceChare.Price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });



        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = jontroCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const cursor = jontroCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        app.post('/order', async (req, res) => {
            const Data = req.body
            const doc = {
                userName: Data.userName,
                userEmail: Data.userEmail,
                userAddress: Data.userAddress,
                userPhoneNumber: Data.userPhoneNumber,
                ProductName: Data.ProductName,
                Quantity: Data.Quantity,
                price: Data.Total
            }
            const result = await BookingCollection.insertOne(doc);
            res.send(result)
        })
        app.put('/order/:id', async (req, res) => {
            const payment = req.body
            const id = req.params.id
            console.log(id,payment);
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.TransactionID
                }
            }
            const result = await BookingCollection.updateOne(filter, updateDoc, options);

            res.send(result)
        })
        app.get('/order', async (req, res) => {
            const email = req.query.email
            const query = { userEmail: email }
            const result = await BookingCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await BookingCollection.deleteOne(query);
            res.send(result)
        })
        app.get('/pay/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const result = await BookingCollection.findOne(query);
            res.send(result)
        })
    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => { res.send('heyyyyy') })
app.listen(port, () => { console.log('listen to port', port) })