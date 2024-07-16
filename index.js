const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const port = process.env.port || 5000;
const corsOptions = {
    origin: ['http://localhost:5173'
    ],
    credentials: true,
    optionSuccessStatus: 200,
  }

app.use(cors(corsOptions));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.bhtyeej.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

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
    const userCollection = client.db('amarCash').collection('users');

      //jwt related api
      app.post('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        })
        res.send({ token })
      })

       //middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access ' })
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

    // register
    app.post('/register', async (req, res) => {
      const { name, email, phoneNumber, pin } = req.body;
      
      if (!name || !email || !phoneNumber || !pin) {
          return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if the user already exists
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
          return res.status(409).json({ message: 'User already exists' });
      }

      // Hash the PIN
      const hashedPin = await bcrypt.hash(pin, 10);

      // Create user object
      const newUser = {
          name,
          email,
          phoneNumber,
          pin: hashedPin,
          status: 'pending',
          role: "user",
          balance: 0,
      };

      // Save user to database
      const result = await userCollection.insertOne(newUser);

      // Create JWT token
      const token = jwt.sign({ userId: result.insertedId, email }, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h',
      });

      res.status(201).json({ token, message: 'Registration successful, awaiting admin approval' });
  });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Salam from Amar Cash server')
  })
  
  app.listen(port, () => {
    console.log(`Amar Cash is running on port ${port}`);
  })