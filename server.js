const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const port = 5000;
const app = express();

mongoose.connect('mongodb+srv://richtwagirayezu123:Twagirayezu123!@cluster0.imv3vu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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
    const {
        sessionId,
        serviceCode,
        phoneNumber,
        text,
    } = req.body;

    let response = '';

    if (text === '') {

        response = `CON Choose Language
1. English
2. Kinyarwanda
0. Exit`;
    } 
    else if (text === '1') {
        await updateUser(phoneNumber, 'English');
        
        response = `CON Choose food information you want to view
1. Eat cassava and potato
2. Eat maize and beans
3. Eat egg and meat
4. Eat chicken and bread
0. Go back`;
    } 
    else if (text === '1*1') {
        response = `END You selected: Eat cassava and potato`;
    } 
    else if (text === '1*2') {
        response = `END You selected: Eat maize and beans`;
    } 
    else if (text === '1*3') {
        response = `END You selected: Eat egg and meat`;
    } 
    else if (text === '1*4') {
        response = `END You selected: Eat chicken and bread`;
    } 
    else if (text === '1*0') {
        response = `CON Choose Language
1. English
2. Kinyarwanda
0. Exit`;
    }
    else if (text === '2') {
        await updateUser(phoneNumber, 'Kinyarwanda');
        
        response = `CON Hitamo amakuru y'ibiryo ushaka kureba
1. Kurya imyumbati n'ibirayi
2. Kurya ibigori n'ibishyimbo
3. Kurya amagi n'inyama
4. Kurya inkoko n'umugati
0. Gusubira inyuma`;
    } 
    else if (text === '2*1') {
        response = `END Wahisemo: Kurya imyumbati n'ibirayi`;
    } 
    else if (text === '2*2') {
        response = `END Wahisemo: Kurya ibigori n'ibishyimbo`;
    } 
    else if (text === '2*3') {
        response = `END Wahisemo: Kurya amagi n'inyama`;
    } 
    else if (text === '2*4') {
        response = `END Wahisemo: Kurya inkoko n'umugati`;
    } 
    else if (text === '2*0') {
        response = `CON Choose Language
1. English
2. Kinyarwanda
0. Exit`;
    }
    else if (text === '0') {
        response = `END Thank you for using our service. Goodbye!`;
    }
    else {
        response = `END Invalid selection. Please try again.`;
    }

    await saveSessionData(sessionId, phoneNumber, text, response);

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

app.listen(port, () => {
    console.log("Server is running on port", port);
});