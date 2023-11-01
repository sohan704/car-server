const express = require('express');
// var jwt = require('jsonwebtoken');
const jwt = require('jsonwebtoken');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');

const port = process.env.PORT || 5000;
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://car-doctor-1257f.web.app',
    'https://car-doctor-1257f.firebaseapp.com'

  ],

  credentials: true,
}));


// app.use(cors({
//   origin: ['http://localhost:5173'],
//   credentials: true,
// }));
app.use(express.json());
app.use(cookieParser());

// console.log(process.env.DB_PASS);


//logger

const logger = (req, res, next) => {
  console.log('log info:- ', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    req.user = decoded;
    next();
  })







}





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kjvt8fn.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection

    const serviceCollection = client.db('CarDoc').collection('Services');
    const bookingCollection = client.db('CarDoc').collection('bookings');






    //auth related api 

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      if (user) {
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

        const expirationDate = new Date(); // Create a new Date object
        expirationDate.setDate(expirationDate.getDate() + 7);

        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Set to true in production
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", 
            
            expiresIn: expirationDate,


            // Adjust based on your requirements
            // maxAge: // how much time the cookie will exist
          })
          .send({ status: "true" });
      }

    })

    //abc@abcd.com

    app.get('/token', async (req, res) => {
      res.send(req.cookies);
    })

    app.post('/logout', async (req, res) => {
      // const user = req.body;
      // console.log('loggin out ', user);
      res.clearCookie("token").send({ success: true });
    })



    // app.post('/jwt', async(req,res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });

    //   res
    //   .cookie('token',token,{
    //     httpOnly:true,
    //     secure: false,
    //     // sameSite: 'none',

    //   })
    //   .send({success: true});
    // })





    //services related API 
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {

        // Include only the `title` and `imdb` fields in the returned document
        projection: { service_id: 1, price: 1, img: 1, title: 1 },
      };


      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };

      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);

    })


    app.get('/bookings', logger, verifyToken, async (req, res) => {


      try {
        let query = {};
        console.log(req.query.email);
        console.log('token here .. .. .. ', req.cookies.token)
        console.log('I am a self taught enginner', req.cookies);
        console.log('Token Owner info', req.user);

        if (req.user?.email !== req.query.email) {
          return res.status(403).send({ message: 'Forbidden Access' });
        }

        if (req.query?.email) {
          query = { email: req.query.email };
        }

        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
        console.error(error);
      }
    });

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })





    // app.get('/bookings', async(req,res) => {
    //   let query = {};
    //   console.log(req.query.email);

    //   if(req.query?.email){
    //     query = {email: req.query.email};
    //   }
    //   const result = await bookingCollection.find(query).toArray();
    //   res.send(result);

    // })
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);









app.get('/', (req, res) => {
  res.send('Doctor is running');
})

app.listen(port, () => {
  console.log(`Car doctor server is running on port ${port}`);

})
