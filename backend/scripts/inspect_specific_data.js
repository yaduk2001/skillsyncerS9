const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Fix .env path: We are running from 'backend/', so .env is in current dir
dotenv.config();

// We need to require User.js. 
// Note: If User.js requires other models, we might need to load them too.
// Checking User.js: It doesn't require other models at top level.
const User = require('../models/User');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env');
        }
        await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('Connection error:', error.message);
        process.exit(1);
    }
};

const inspect = async () => {
    try {
        await connectDB();

        console.log('\n--- DATA INSPECTION ---');

        // 1. Get the Mentor "Salu Manoj"
        // Try exact match on email first
        const mentor = await User.findOne({ email: 'salumanoj2026@mca.ajce.in' });

        if (!mentor) {
            console.log('Mentor "salumanoj2026@mca.ajce.in" NOT FOUND by email.');
            // Fallback: search by name
            const mentorByName = await User.findOne({ name: { $regex: 'Salu Manoj', $options: 'i' } });
            if (mentorByName) {
                console.log(`FOUND MENTOR BY NAME: ${mentorByName.name} (${mentorByName.email})`);
                logMentor(mentorByName);
            }
        } else {
            console.log(`FOUND MENTOR: ${mentor.name}`);
            await logMentor(mentor);
        }

        // 2. Get the Company "Freshhirre"
        const freshhire = await User.findOne({
            $or: [
                { 'company.name': { $regex: 'Freshhirre', $options: 'i' } },
                { name: { $regex: 'Freshhirre', $options: 'i' } }
            ]
        });

        if (freshhire) {
            console.log(`\nFOUND COMPANY: Freshhirre`);
            console.log(`- ID: ${freshhire._id}`);
            console.log(`- Name: ${freshhire.company?.name || freshhire.name}`);
        } else {
            console.log('\nFreshhirre NOT FOUND');
        }

        // 3. Get the Company "Aimsioft"
        const aimsioft = await User.findOne({
            $or: [
                { 'company.name': { $regex: 'Aimsioft', $options: 'i' } },
                { name: { $regex: 'Aimsioft', $options: 'i' } }
            ]
        });

        if (aimsioft) {
            console.log(`\nFOUND COMPANY: Aimsioft`);
            console.log(`- ID: ${aimsioft._id}`);
            console.log(`- Name: ${aimsioft.company?.name || aimsioft.name}`);
        } else {
            console.log('\nAimsioft NOT FOUND');
        }

    } catch (err) {
        console.error('Script Error:', err);
    }
    process.exit(0);
};

async function logMentor(mentor) {
    console.log(`- ID: ${mentor._id}`);
    console.log(`- Role: ${mentor.role}`);
    console.log(`- EmployeeProfile CompanyId: ${mentor.employeeProfile?.companyId}`);

    if (mentor.employeeProfile?.companyId) {
        const linkedCompany = await User.findById(mentor.employeeProfile.companyId);
        console.log(`- LINKED COMPANY: ${linkedCompany?.company?.name || linkedCompany?.name} (ID: ${linkedCompany?._id})`);
    } else {
        console.log('- NO COMPANY LINKED in EmployeeProfile');
    }
}

inspect();
