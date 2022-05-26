const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const cors = require('cors')
require('dotenv').config()
app.use(cors())
app.use(express.json())
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const uri = `mongodb+srv://mynul:${process.env.PASS}@cluster0.sfcnp.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// jwt verify

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        // all collection
        const jontroCollection = client.db('JontroManufacture').collection('tools');
        const BookingCollection = client.db('BookingCollection').collection('Booking');
        const ReviewCollection = client.db('ReviewCollection').collection('review');
        const userCollection = client.db('userCollection').collection('user');
        const registeredUser
            = client.db('registeredUser').collection('users');
// payment system

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

// tools

        app.get('/tools', async (req, res) => {
            const query = {}
            const cursor = jontroCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        // tools per id
        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const cursor = jontroCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        // order set

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
        app.get('/order', verifyJWT, async (req, res) => {
            const query = {}
            const result = await BookingCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/order', verifyJWT, async (req, res) => {
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
        app.get('/pay/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) };
            const result = await BookingCollection.findOne(query);
            res.send(result)
        })
        app.post('/reviews', async (req, res) => {
            const reviews = req.body
            const doc = {
                description: reviews.description,
                ratings: reviews.Ratings
            }
            const result = await ReviewCollection.insertOne(doc);

            res.send(result)
        })
        app.get('/reviews', async (req, res) => {
            const query = {}

            const result = await ReviewCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/profile', async (req, res) => {
            const profiles = req.body
            const doc = {
                userName: profiles.userName,
                email: profiles.email,
                education: profiles.education,
                address: profiles.address,
                phone: profiles.phone,
                linkedin: profiles.linkedin
            }
            const result = await userCollection.insertOne(doc);

            res.send(result)
        })
        app.get('/profile', verifyJWT, async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })

        app.put('/profile', async (req, res) => {
            const email = req.query.email
            const profiles = req.body
            const filter = { email: email }
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    userName: profiles.userName,
                    email: profiles.email,
                    education: profiles.education,
                    address: profiles.address,
                    phone: profiles.phone,
                    linkedin: profiles.linkedin
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);

            res.send(result)
        })

        app.post('/userRegistration/:email', async (req, res) => {
            const email = req.params.email
            const doc = {
                email: email
            }
            const result = await registeredUser.insertOne(doc);
            res.send(result)
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });


        app.get('/userRegistration/:email', verifyJWT, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await registeredUser.findOne(query)
            res.send(result)
        })


        app.post('/addproduct', async (req, res) => {
            const product = req.body
            const doc = {
                name: product.name,
                image: product.image,
                minimumOrder: product.minimumOrder,
                AvailableQuantity: product.AvailableQuantity,
                price: product.price,
                description: product.description,

            }
            const result = await jontroCollection.insertOne(doc);

            res.send(result)
        })
        app.get('/makeadmin', verifyJWT, async (req, res) => {
            const query = {}
            const cursor = registeredUser.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })


        app.put('/makeadmin/:id', async (req, res) => {
            const id = req.params.id
            const makeadmin = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    admin: makeadmin?.admin
                }
            }
            const result = await registeredUser.updateOne(filter, updateDoc, options);

            res.send(result)
        })

        app.put('/shipment/:id', async (req, res) => {
            const shipments = req.body.shipped
            const id = req.params.id
            const filter = {_id: ObjectId(id)}
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    shipped: shipments
                }
            }
            const result = await BookingCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })


    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => { res.send('heyyyyy') })
app.listen(port, () => { console.log('listen to port', port) })