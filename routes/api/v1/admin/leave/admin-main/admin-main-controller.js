

exports.getAdminMain = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Admin Main page
	router.get('/getAdminMain', adAdminMainCtrl.getAdminMain);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {

        const adUser = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            }
        ).lean();

        if (adUser.company_id == null || adUser.company_id == '') {
            return res.send({
                message: 'not found'
            });
        }

        const pendingCompany = await dbModels.PendingCompanyRequest.find(
            {
                company_id: adUser.company_id,
                status: 'pending'
            }
        ).lean();

        const countPendingCompany = pendingCompany.length;



        const companyEmployee = await dbModels.Member.find(
            {
                company_id: adUser.company_id,
                isAdmin: false
            }
        ).lean();

        const countCompanyEmployee = companyEmployee.length;

        return res.send({
            message: 'getAdminMain',
            countCompanyEmployee,
            countPendingCompany
        })

    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: 'An error has occurred'
        });
    }

}

exports.getAdminMainTest = async (req, res) => {
    console.log(`
--------------------------------------------------
	User : ${req.decoded._id}
	API  : Admin Main page
	router.get('/getAdminMain', adAdminMainCtrl.getAdminMain);
--------------------------------------------------`);
    const dbModels = global.DB_MODELS;

    try {

        const adUser = await dbModels.Admin.findOne(
            {
                _id: req.decoded._id
            }
        ).lean();

        if (adUser.company_id == null || adUser.company_id == '') {
            return res.send({
                message: 'not found'
            });
        }

        const pendingCompany = await dbModels.PendingCompanyRequest.find(
            {
                company_id: adUser.company_id,
                status: 'pending'
            }
        ).lean();

        const countPendingCompany = pendingCompany.length;



        const companyEmployee = await dbModels.Member.find(
            {
                company_id: adUser.company_id,
                isAdmin: false
            }
        ).lean();

        const countCompanyEmployee = companyEmployee.length;

        return res.send({
            message: 'getAdminMain',
            countCompanyEmployee,
            countPendingCompany
        })

    } catch (err) {
        console.log(err);
        return res.status(500).send({
            message: 'An error has occurred'
        });
    }

}