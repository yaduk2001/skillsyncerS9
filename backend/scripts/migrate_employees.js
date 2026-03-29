const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(process.cwd(), 'backend/.env');
dotenv.config({ path: envPath });

const run = async () => {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) throw new Error('MONGODB_URI is undefined');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // 1. Get all Employers and map Company Name -> ID
        const employers = await User.find({
            $or: [{ role: 'employer' }, { secondaryRoles: 'employer' }],
            'company.name': { $exists: true, $ne: '' }
        }).select('company.name');

        const companyMap = new Map();
        employers.forEach(emp => {
            if (emp.company?.name) {
                // Normalize name for matching (trim, lowercase)
                const key = emp.company.name.trim().toLowerCase();
                companyMap.set(key, emp._id);
                console.log(`Found Employer for company: "${emp.company.name}" (ID: ${emp._id})`);
            }
        });

        // 2. Get all Employees without companyId
        const employees = await User.find({
            $or: [{ role: 'employee' }, { secondaryRoles: 'employee' }]
        });

        let updatedCount = 0;
        let skippedCount = 0;
        let noMatchCount = 0;

        for (const emp of employees) {
            if (emp.employeeProfile?.companyId) {
                skippedCount++;
                continue;
            }

            // Try to find company name on the employee
            // Check root company.name first
            const empCompanyName = emp.company?.name;

            if (!empCompanyName) {
                // Use a fallback or log that we can't migrate this one
                console.log(`⚠️  Employee "${emp.name}" (ID: ${emp._id}) has no company.name set. Cannot migrate.`);
                noMatchCount++;
                continue;
            }

            const key = empCompanyName.trim().toLowerCase();
            const employerId = companyMap.get(key);

            if (employerId) {
                // Initialize employeeProfile if needed
                if (!emp.employeeProfile) emp.employeeProfile = {};

                emp.employeeProfile.companyId = employerId;
                await emp.save();
                console.log(`✅ Linked Employee "${emp.name}" to Company "${empCompanyName}" (EmployerID: ${employerId})`);
                updatedCount++;
            } else {
                console.log(`❌ No Employer found matching company name "${empCompanyName}" for Employee "${emp.name}"`);
                noMatchCount++;
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total Employees Checked: ${employees.length}`);
        console.log(`Already Linked: ${skippedCount}`);
        console.log(`Successfully Linked: ${updatedCount}`);
        console.log(`Failed (No Company Name / No Match): ${noMatchCount}`);

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        process.exit();
    }
};

run();
