const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const port = 5000;
const app = express();

mongoose.connect('mongodb+srv://umwiza05:Mukamana5@cluster0.hcasg0h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ Could not connect to MongoDB', err));

const userSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  language: { type: String, enum: ['English', 'Kinyarwanda'], default: 'English' },
  lastAccessed: { type: Date, default: Date.now }
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true },
  interactions: [{
    input: String,
    response: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now, expires: 3600 }
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
    console.error('❌ Error saving session data:', error);
  }
}

async function updateUser(phoneNumber, language) {
  try {
    await User.findOneAndUpdate(
      { phoneNumber },
      { phoneNumber, language, lastAccessed: Date.now() },
      { upsert: true }
    );
  } catch (error) {
    console.error('❌ Error updating user:', error);
  }
}

app.post('/ussd', async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  let response = '';

  switch (text) {
    case '':
      response = `CON Welcome to AirTicket Info
1. Continue
0. Exit`;
      break;

    case '1':
      response = `CON Choose your language:
1. English
2. Kinyarwanda
0. Exit`;
      break;

    case '1*1':
      await updateUser(phoneNumber, 'English');
      response = `CON Select a destination:
1. Ticket to Dubai
2. Ticket to Canada
3. Ticket to Qatar
4. Ticket to Italy
0. Back`;
      break;

    case '1*2':
      await updateUser(phoneNumber, 'Kinyarwanda');
      response = `CON Hitamo aho ushaka kujya:
1. Itike ya Dubai
2. Itike ya Kanada
3. Itike ya Katari
4. Itike ya Ubutaliyani
0. Gusubira inyuma`;
      break;

    // English Ticket Info
    case '1*1*1': response = `END You selected: Ticket to Dubai`; break;
    case '1*1*2': response = `END You selected: Ticket to Canada`; break;
    case '1*1*3': response = `END You selected: Ticket to Qatar`; break;
    case '1*1*4': response = `END You selected: Ticket to Italy`; break;

    // Kinyarwanda Ticket Info
    case '1*2*1': response = `END Wahisemo: Itike ya Dubai`; break;
    case '1*2*2': response = `END Wahisemo: Itike ya Kanada`; break;
    case '1*2*3': response = `END Wahisemo: Itike ya Katari`; break;
    case '1*2*4': response = `END Wahisemo: Itike ya Ubutaliyani`; break;

    // Go back to language selection
    case '1*1*0':
    case '1*2*0':
      response = `CON Choose your language:
1. English
2. Kinyarwanda
0. Exit`;
      break;

    // Exit options
    case '0':
    case '1*0':
      response = `END Thank you for using our service. Goodbye!`;
      break;

    default:
      response = `END Invalid input. Please try again.`;
  }

  await saveSessionData(sessionId, phoneNumber, text, response);

  res.set('Content-Type', 'text/plain');
  res.send(response);
});

app.listen(port, () => {
  console.log(`🚀 USSD Server running on port ${port}`);
});
