try {
    console.log('Attempting to require mentorAssignment...');
    const ma = require('../utils/mentorAssignment');
    console.log('Successfully required mentorAssignment');
    console.log('Exports:', Object.keys(ma));
} catch (error) {
    console.error('FAILED to require mentorAssignment');
    console.error(error);
}
