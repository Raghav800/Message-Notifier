const express = require('express');
const mongoose = require('mongoose');
const User = require('./src/models/user');
const bodyParser = require('body-parser');
const twilioConfig = require('./src/config/twilio');
const twilio = require('twilio')(twilioConfig.accountSid, twilioConfig.authToken);
const app = express();
const cron = require('node-cron');
const moment = require('moment');
const cors = require('cors');

const corsOptions = {
  origin: "http://localhost:3000",
}
app.use(cors()); 

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send("heyhere");
});

app.post('/addUser', async (req, res) => {
    const { phoneNumber, userGroup } = req.body;

    try {
        const newUser = new User({ phoneNumber, userGroup });
        await newUser.save();
        res.status(201).json({ message: 'User added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.post('/getUserGroups', async (req, res) => {
    try {
        User.distinct('userGroup')
            .then((distinctUserGroups) => {
                res.status(201).send(distinctUserGroups);
            })
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
})

const sendSheduleSMS = async (to, body, sendAt) => {
    console.log("Schedule time")
    console.log(new Date(sendAt))
    try {
        await twilio.messages.create({
            body,
            messagingServiceSid: "MGb01725215e538faaa5c05fdab6633890",
            scheduleType: "fixed",
            sendAt: new Date(sendAt),
            to,
        });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
};

const sendSMS = async (to, body) => {
    try {
        await twilio.messages.create({
            body,
            from: twilioConfig.from,
            to,
        });
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
};


app.post('/sendMessage', async (req, res) => {
    try {
        const { msg, userGroup, scheduleTime, recurringInterval, endDate } = req.body;

        const users = await User.find({ userGroup });


        if (scheduleTime) {
            for (const user of users) {
                await sendSheduleSMS(user.phoneNumber, msg, scheduleTime);
            }
        }
        else if (recurringInterval) {
            console.log("cron")
            let cronStr = "";
            if (recurringInterval == "day") cronStr = "0 12 * * *"
            else if (recurringInterval == "week") cronStr = "0 12 * * 1"
            else cronStr = "0 12 1 * *"
            const end = moment(new Date(endDate));

            const job = cron.schedule(cronStr, async () => {
                const now = moment();
                if (now.isAfter(end)) {
                    job.stop();
                    console.log('Cron job stopped due to end date');
                }
                console.log("Cron Job ran")
                for (const user of users) {
                    await sendSMS(user.phoneNumber, msg);
                }
            });
            job.start()
        }
        else {
            for (const user of users) {
                await sendSMS(user.phoneNumber, msg);
            }
        }
        res.status(201).json({ message: 'Message sent successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
})

mongoose.connect('mongodb+srv://root:admin1234@cluster0.rvyoja6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('MongoDB is connected');

        app.listen(5000, () => {
            console.log("Node app API is running on port 3000");
        });
    })
    .catch((err) => {
        console.log(err);
    });