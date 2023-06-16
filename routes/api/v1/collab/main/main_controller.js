const { ObjectId } = require('bson');
exports.getMainInfo = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Get Main Info
	router.get('/main/getMainInfo', mainController.getMainInfo);
--------------------------------------------------`);

    const dbModels = global.DB_MODELS;


    try {

        const spaceHistory = await dbModels.Space.aggregate([
            {
                $match:{
                    members: ObjectId(req.decoded._id)
                }
            },
            {
                $lookup:{
                    from: 'myspacehistories',
                    localField: '_id',
                    foreignField: 'space_id',
                    as: 'history'
                }
            },
            {
                $unwind:{
                    path: '$history',
                    preserveNullAndEmptyArrays: false
                }
            },
            {
                $project:{
                    space_id : 1,
                    space_name: '$displayName',
                    spaceTime: '$_id',
                    doc_id: '$history.doc_id',
                    history_id: '$history._id',
                    type: '$history.type',
                    content: '$history.content',
                    createdAt: '$history.createdAt',
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);

        // const meeting = await dbModels.meeting.find(
        //     {
        //         enlistedMembers: req.decoded._id
        //     }
        // )
        
        const meeting = await dbModels.Meeting.aggregate([
            {
                $match:{
                    enlistedMembers: ObjectId(req.decoded._id)
                }
            },
            {
                $lookup:{
                    from: 'documents',
                    localField: 'docId',
                    foreignField: '_id',
                    as: 'document'
                }
            },
            {
                $unwind: {
                    path: '$document',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'spaces',
                    localField: 'document.spaceTime_id',
                    foreignField: '_id',
                    as: 'spaces'
                }
            },
            {
                $unwind: {
                    path: '$spaces',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project:{
                    _id: 1,
                    meetingTitle: 1,
                    isDone: 1,
                    start_date: 1,
                    docTitle: '$document.docTitle',
                    spaceName: '$spaces.displayName',
                }
            }   
        ]);
        // console.log(meeting);

        const company = await dbModels.PendingCompanyRequest.aggregate([
            {
                $match: {
                    member_id: ObjectId(req.decoded._id)
                }
            },
            {
                $lookup: {
                    from: 'companies',
                    localField: 'company_id',
                    foreignField: '_id',
                    as: 'company'
                }
            },
            {
                $unwind: {
                    path: '$company',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    company_id: 1,
                    company_name: '$company.company_name',
                    member_id: 1,
                    status: 1,
                }
            }
        ]);

        const manager = await dbModels.Manager.aggregate([
            {
                $match:{
                    myId: ObjectId(req.decoded._id)
                }
            },
            {
                $lookup:{
                    from: 'members',
                    localField: 'myManager',
                    foreignField: '_id',
                    as: 'manager'
                }
            },
            {
                $unwind:{
                    path: '$manager',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    accepted: 1,
                    myManager: 1,
                    email: '$manager.email',
                    name: '$manager.name',
                    profile_img: '$manager.profile_img',
                }
            }
        ]);



        // console.log(manager);
        return res.status(200).send({
            message: 'getMainInfo',
            spaceHistory,
            meeting,
            company,
            manager
        })

    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: 'An error has occurred'
        });

    }

}