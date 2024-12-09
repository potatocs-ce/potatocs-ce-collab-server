const mongoose = require('mongoose');

const menuSide = mongoose.Schema( 
    {
        member_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
            required: true
        },
        folder_list: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Folder',
            },
        ],
        space_list: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Space',
            }
        ]
       
    }
);


const MenuSide = mongoose.model('MenuSide', menuSide);

module.exports = MenuSide;
