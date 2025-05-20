const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const port = 5000;
const app = express();

mongoose.connect('mongodb+srv://umwiza05:Mukamana5@cluster0.hcasg0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));
const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  language: {
    type: String,
    enum: ['English', 'Kinyarwanda'],
    default: 'English'
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
});

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  interactions: [{
    input: String,
    response: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 
  }
});

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

async function saveSessionData(sessionId, phoneNumber, input, response) {
  try {

    let session = await Session.findOne({ sessionId });
    
    if (!session) {
      session = new Session({
        sessionId,
        phoneNumber,
        interactions: [{ input, response }]
      });
    } else {
      session.interactions.push({ input, response });
    }
    
    await session.save();
  } catch (error) {
    console.error('Error saving session data:', error);
  }
}
async function updateUser(phoneNumber, language) {
  try {
    await User.findOneAndUpdate(
      { phoneNumber },
      { 
        phoneNumber,
        language,
        lastAccessed: Date.now()
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

app.post('/ussd', async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  let response = '';

  if (text === '') {
    response = `CON Welcome To QuickShop / Karibuni
1. Continue`;
  }
  else if (text === '1') {
 
    response = `CON Select Language:
1. English
2. Kinyarwanda
0. Exit`;
  }
  else if (text === '1*1') {
    await updateUser(phoneNumber, 'English');
    response = `CON Choose Service Inormation  you want :
1. View Categories
2. My Cart
3. Checkout
4. Exit
0. Go back`;
  }
  else if (text === '1*2') {
    await updateUser(phoneNumber, 'Kinyarwanda');
    response = `CON Hitamo amakuru y'ibyo ushaka:
1. Reba Ibyiciro
2. Ibyo dufite Mububiko
3. Genzura Ibyo Dufite
4. Sohoka
0. Gusubira inyuma`;
  }
  else if (text === '1*0') {
    // Go back to welcome screen
    response = `CON Welcome / Karibu
1. Continue`;
  }
else if (text === '1') {
  response = `CON Welcome to QuickShop
1. View Categories
2. My Cart
3. Checkout
0. Exit`;
}
else if (text === '1*1') {
  response = `CON Select a category:
1. Food & Drinks
2. Electronics
3. Clothing
0. Back`;
}
else if (text === '1*1*1') {
  response = `CON Choose a product:
1. Rice - 5000 RWF
2. Beans - 3000 RWF
3. Milk - 800 RWF
0. Back`;
}
else if (text === '1*1*1*1') {
  response = `END You added Rice to your cart.`;
}

    // Back to language selection
    response = `CON Select Language:
1. English
2. Kinyarwanda
0. Exit`;
  }
  else if (text === '0' || text === '1*0') {
    response = `END Thank you for using our service. Goodbyeeee!`;
  }
  else {
    response = `END Invalid selection. Please try again.`;
  }

  await saveSessionData(sessionId, phoneNumber, text, response);

  res.set('Content-Type', 'text/plain');
  res.send(response);
 
app.listen(port, () => {
    console.log("Server is running on port", port);
});