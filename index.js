const express = require("express");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;
const { ObjectId } = require('mongodb');


// middleware
app.use(cors());
app.use(express.json())

require('dotenv').config()


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q1fcrjh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // client.connect();

    const petListingCollection = client.db('petDB').collection('petListing');
    const userCollection = client.db('petDB').collection('users');
    const donationCollection = client.db('petDB').collection('donationCampaign');
    const adoptionRequestCollection = client.db('petDB').collection('adoptionRequest');
    const paymentCollection = client.db("petDB").collection("payments");
    // jwt related api
    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'1h'
      });
      res.send({token});
    })

    

    // middlewares
    const verifyToken = (req,res,next)=>{
      if(!req.headers.authorization){
        return res.data.status(401).send({message: 'forbidden access'});
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    app.get('/petLIsting', async(req,res)=>{
      const cursor = petListingCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    
    
    // DONATION CAMPAIGN
    app.get('/donationCampaign', async(req,res)=>{
      const cursor = donationCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    
    // update Donation item by admin
    app.get('/donationCampaign/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationCollection.findOne(query);
      res.send(result);
    })
    
    // update Donation item by admin
    app.patch('/donationCampaign/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      
      const filter = { _id: new ObjectId(id) }
      console.log(filter)
      const updatedDoc = {
        $set: {
          name: item.name,
          image: item.image,
          donated : item.donated,
          maxDonationAmount: item.maxDonationAmount,
          donatedAmount: item.donatedAmount
          
          
        }
      }
      
      const result = await donationCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
    
    // update pet item by admin
    app.get('/petLIsting/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petListingCollection.findOne(query);
      res.send(result);
    })
    
    // update pet item by admin
    app.patch('/petLIsting/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          type: item.type,
          age: item.age,
          location: item.location,
          image: item.image,
          srDescription: item.srDescription,
          lgDescription: item.lgDescription,
          adopted : item.adopted,
          
          
        }
      }
      
      const result = await petListingCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })
    
    app.post('/petLIsting', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await petListingCollection.insertOne(item);
      res.send(result);
    });
    

    //adoption request get from the database 
    app.get('/adoptionRequest', async(req,res)=>{
      const cursor = adoptionRequestCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    // adoption request post into the database
    app.post('/adoptionRequest', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await adoptionRequestCollection.insertOne(item);
      res.send(result);
    });
    
    // added Donation Campaign
    app.post('/donationCampaign', verifyToken, async (req, res) => {
      const item = req.body;
      const result = await donationCollection.insertOne(item);
      res.send(result);
    });

    
    
    // verify admin 
      const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // users related api
    app.get('/users',verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // delete pet item by admin
    app.delete('/petLIsting/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await petListingCollection.deleteOne(query);
      res.send(result);
    })

    // delete donation item by admin
    app.delete('/donationCampaign/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await donationCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/donationCampaign/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          image: item.image,
          maxDonationAmount: item.maxDonationAmount,
          lastDateOfDonation: item.lastDateOfDonation,
          donated: item.donated,
          srDescription: item.srDescription,
          lgDescription: item.lgDescription,
          userEmail: item.userEmail,
          createdAt: item.createdAt,
          
        }
      }
      
      const result = await petListingCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })


    // for admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    
    app.post('/users', async(req,res)=>{
      const user = req.body;
      
      const query = {email:user.email}
      const isExitingUser = await userCollection.findOne(query)
      if(isExitingUser){
        return res.send({message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    
    
    // make admin api
    app.patch('/users/admin/:id',verifyToken, verifyAdmin, async(req,res)=>{
      const id = req.params.id;
      const filter = { '_id': new ObjectId(id) };
      const updatedDoc ={
        $set:{
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter,updatedDoc);
      res.send(result);
    })




    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { donation } = req.body;
      const amount = parseInt(donation * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        
        currency: 'usd',
        payment_method_types: ['card']
      });
      console.log(amount),

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

   
    

    app.get('/create-payment', async (req, res) => {
      const cursor = paymentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    // post data in to the database
    app.post('/create-payment', async (req, res)=>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      // console.log('payment info', payment);
      // const query = {
      //   _id: {
      //     $in: payment.cartIds.map(id => new ObjectId(id))
      //   }
      // };
      res.send(paymentResult)
    })

    app.get('/create-payment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await paymentCollections.findOne(query);
      res.send(result);
    })

    app.delete('/create-payment/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await paymentCollection.deleteOne(query);
      res.send(result);
    })
    



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('users server is running')
})

app.listen(port, ()=>{
    console.log(`Server is running on PORT :${port}`)
})