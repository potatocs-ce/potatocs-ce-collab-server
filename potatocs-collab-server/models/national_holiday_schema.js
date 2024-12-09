const mongoose = require('mongoose');

const nationalHoliday = mongoose.Schema( 
    {
        countryName: {
            type: String,
            required: true
        },
        countryCode: {
            type: String,
            required: true
        },
        countryHoliday: [
            {
                holidayName: {
                    type: String
                },
                holidayDate: {
                    type: String
                }
            }
        ],
       
    }
);


const NationalHoliday = mongoose.model('NationalHoliday', nationalHoliday);

module.exports = NationalHoliday;
