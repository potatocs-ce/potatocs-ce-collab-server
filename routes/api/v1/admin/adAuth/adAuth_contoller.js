const jwt = require('jsonwebtoken');
const admin = require('../../../../../models/admin_schema');
const adMenuSide = require('../../../../../models/ad_menu_side_schema');
const randomize = require('randomatic');
const nodemailer = require("nodemailer");


/*-------------------------------------------------
    Sign Up
-------------------------------------------------*/
exports.signUp = async (req, res) => {
    console.log(`
--------------------------------------------------  
  API  : Signup
  router.post('signUp', adAuthcontroller.signUp) 
--------------------------------------------------`);
    // console.log(req.body);

    const criteria = {
        email: req.body.email
    };
    const projection = '_id';
    const adminData = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
    }

    try {
        const adminUser = await admin.findOne(criteria, projection).lean();

        if (adminUser) {
            return res.status(409).send({
                message: 'duplicated'
            })
        }

        const newAdmin = admin(adminData);
        const newAdMenuSide = adMenuSide({ admin_id: newAdmin._id });	// 회원가입 하면 menuside가 만들어짐

        await newAdmin.save();
        await newAdMenuSide.save();	// 회원가입 하면 menuside가 만들어짐

        res.status(201).send({
            message: 'created'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            error
        });
    }

};

/*-------------------------------------------------
    Sign In
-------------------------------------------------*/
exports.signIn = async (req, res) => {
    console.log(`
--------------------------------------------------  
  API  : SignIn
  router.post('signIn', adAuthcontroller.signIn) 
--------------------------------------------------`);
    // console.log(req.body);

    const criteria = {
        email: req.body.email
    }

    try {
        console.log('-------------------email----------------------')
        const date = new Date();
        console.log(date)
        console.log(req.body.email)
        console.log('----------------------------------------------')

        const adminUser = await admin.findOne(criteria);

        if (!adminUser) {
            // console.log('No Matched Account');
            return res.status(404).send({
                message: 'not found'
            });
        }

        if (adminUser && adminUser.retired == true) {
            return res.status(400).send({
                message: `retired`
            });
        }

        const isMatched = await adminUser.comparePassword(req.body.password, adminUser.password);

        if (!isMatched) {
            // console.log('Password Mismatch');
            return res.status(404).send({
                message: 'mismatch'
            });
        }

        const payload = {
            _id: adminUser._id,
            name: adminUser.name,
            isAdmin: adminUser.isAdmin
        };

        const jwtOption = {
            expiresIn: '1d'
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, jwtOption);


        /*------------------------------------------
            5. send token and profile info to client
        --------------------------------------------*/
        res.send({
            token
        });


    } catch (error) {
        console.log(error);
        return res.status(500).send('An error has occurred in the server');
    }
};

// https://www.npmjs.com/package/randomatic
// randomize('A0', 16) will generate a 16-character, alpha-numeric randomized string
/*-------------------------------------------------
    Find Password
    Create a verification code
    Send an email to the user
-------------------------------------------------*/
exports.getEcode = async (req, res) => {
    console.log(`
--------------------------------------------------  
  API  : getEcode
  router.post('getEcode', adAuthcontroller.getEcode) 
--------------------------------------------------`);

    try {

        // Check the email up in order to exist
        const criteria = {
            email: req.body.email
        }

        // Create a code
        const eCodeDate = new Date();
        const eCode = randomize('A0', 16);

        const passwordReset = {
            pw_reset_code: eCode,
            pw_reset_date: eCodeDate
        }

        const user = await admin.findOneAndUpdate(criteria, passwordReset);

        if (!user) {
            console.log('NO RESULT');
            return res.status(404).send({
                message: 'not found'
            });
        }

        // --------------------------- AWS_SES

        // If you're using Amazon SES in a region other than US West (Oregon),
        // replace email-smtp.us-west-2.amazonaws.com with the Amazon SES SMTP
        // endpoint in the appropriate AWS Region.
        const smtpEndpoint = "email-smtp.us-east-1.amazonaws.com";

        // The port to use when connecting to the SMTP server.
        const port = 587;

        // Replace sender@example.com with your "From" address.
        // This address must be verified with Amazon SES.
        const senderAddress = "POTATOCS <info@potatocs.com>";

        // Replace recipient@example.com with a "To" address. If your account
        // is still in the sandbox, this address must be verified. To specify
        // multiple addresses, separate each address with a comma.
        var toAddresses = req.body.email;

        // CC and BCC addresses. If your account is in the sandbox, these
        // addresses have to be verified. To specify multiple addresses, separate
        // each address with a comma.
        // var ccAddresses = "cc-recipient0@example.com,cc-recipient1@example.com";
        var ccAddresses = "";
        var bccAddresses = "";

        // Replace smtp_username with your Amazon SES SMTP user name.
        const smtpUsername = process.env.AWS_SES_ACCESS_KEY;

        // Replace smtp_password with your Amazon SES SMTP password.
        const smtpPassword = process.env.AWS_SES_SECRET_ACCESS_KEY;

        // (Optional) the name of a configuration set to use for this message.
        // var configurationSet = "ConfigSet";
        var configurationSet = "";

        // The subject line of the email
        var subject = "[Potatocs] Verification code";

        // The email body for recipients with non-HTML email clients.
        var body_text = `VERIFICATION CODE
		---------------------------------
		Hi
		To continue finding your password, please use the verification code.
		
		Verification Code:
		${passwordReset.pw_reset_code}`;

        // The body of the email for recipients whose email clients support HTML content.
        var body_html = `<html>
		<head></head>
		<body>
			<p>Hi</p>
			<p>To continue finding your password, please use the verification code.</p>
			<br/>
			<p>Verification Code</p>
			<div style="width: 500px; height:300px; font-size: 30px; font-weight: bold;">${passwordReset.pw_reset_code}</div>
		</body>
		</html>`;

        // The message tags that you want to apply to the email.
        var tag0 = "key0=value0";
        var tag1 = "key1=value1";

        async function main() {

            // Create the SMTP transport.
            let transporter = nodemailer.createTransport({
                host: smtpEndpoint,
                port: port,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: smtpUsername,
                    pass: smtpPassword
                }
            });

            // Specify the fields in the email.
            let mailOptions = {
                from: senderAddress,
                to: toAddresses,
                subject: subject,
                cc: ccAddresses,
                bcc: bccAddresses,
                text: body_text,
                html: body_html,
                // Custom headers for configuration set and message tags.
                headers: {
                    'X-SES-CONFIGURATION-SET': configurationSet,
                    'X-SES-MESSAGE-TAGS': tag0,
                    'X-SES-MESSAGE-TAGS': tag1
                }
            };

            // Send the email.
            let info = await transporter.sendMail(mailOptions)

            console.log("Message sent! Message ID: ", info.messageId);
        }

        main().catch(console.error);
        // --------------------------- AWS_SES


        return res.send({
            message: 'created'
        })

    } catch (err) {
        return res.ststus(500).send('Server Error');
    }

};

/*-------------------------------------------------
    Find Password 
    Create a temp pwd and update. 
    Then, send an email to the user
-------------------------------------------------*/
exports.getTempPw = async (req, res) => {
    console.log(`
--------------------------------------------------  
  API  : getTempPw
  router.put('getTempPw', adAuthcontroller.getEcode) 
--------------------------------------------------`);

    console.log(req.body);
    const tempPw = randomize('aA0', 12);

    try {
        const emailMatch = {
            email: req.body.email
        }

        const projection = {
            pw_reset_code: 1,
            pw_reset_date: 1
        }

        const user = await admin.findOne(emailMatch, projection).lean();

        if (user.pw_reset_code !== req.body.eCode) {
            console.log('NOT MATCHED');
            return res.status(404).send({
                message: 'not match'
            });
        }

        const updatePw = {
            password: tempPw
        }

        const getTempPw = await admin.findOneAndUpdate(emailMatch, updatePw);

        if (!getTempPw) {
            console.log('NO RESULT');
            return res.status(404).send({
                message: 'pwd err'
            });
        };

        // --------------------------- AWS_SES

        // If you're using Amazon SES in a region other than US West (Oregon),
        // replace email-smtp.us-west-2.amazonaws.com with the Amazon SES SMTP
        // endpoint in the appropriate AWS Region.
        const smtpEndpoint = "email-smtp.us-east-1.amazonaws.com";

        // The port to use when connecting to the SMTP server.
        const port = 587;

        // Replace sender@example.com with your "From" address.
        // This address must be verified with Amazon SES.
        const senderAddress = "POTATOCS <info@potatocs.com>";

        // Replace recipient@example.com with a "To" address. If your account
        // is still in the sandbox, this address must be verified. To specify
        // multiple addresses, separate each address with a comma.
        var toAddresses = req.body.email;

        // CC and BCC addresses. If your account is in the sandbox, these
        // addresses have to be verified. To specify multiple addresses, separate
        // each address with a comma.
        // var ccAddresses = "cc-recipient0@example.com,cc-recipient1@example.com";
        var ccAddresses = "";
        var bccAddresses = "";

        // Replace smtp_username with your Amazon SES SMTP user name.
        const smtpUsername = process.env.AWS_SES_ACCESS_KEY;

        // Replace smtp_password with your Amazon SES SMTP password.
        const smtpPassword = process.env.AWS_SES_SECRET_ACCESS_KEY;

        // (Optional) the name of a configuration set to use for this message.
        // var configurationSet = "ConfigSet";
        var configurationSet = "";

        // The subject line of the email
        var subject = "[Potatocs] Reset password";

        // The email body for recipients with non-HTML email clients.
        var body_text = `VERIFICATION CODE
		---------------------------------
		Hi
		Your password has reset. When you sign in, change the temporary password.
		
		Temporary Password:
		${updatePw.password}`;

        // The body of the email for recipients whose email clients support HTML content.
        var body_html = `<html>
		<head></head>
		<body>
			<p>Hi</p>
			<p>Your password has reset. When you sign in, change the temporary password immediately.</p>
			<br/>
			<p>Temporary Password</p>
			<div style="width: 500px; height:300px; font-size: 30px; font-weight: bold;">${updatePw.password}</div>
		</body>
		</html>`;

        // The message tags that you want to apply to the email.
        var tag0 = "key0=value0";
        var tag1 = "key1=value1";

        async function main() {

            // Create the SMTP transport.
            let transporter = nodemailer.createTransport({
                host: smtpEndpoint,
                port: port,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: smtpUsername,
                    pass: smtpPassword
                }
            });

            // Specify the fields in the email.
            let mailOptions = {
                from: senderAddress,
                to: toAddresses,
                subject: subject,
                cc: ccAddresses,
                bcc: bccAddresses,
                text: body_text,
                html: body_html,
                // Custom headers for configuration set and message tags.
                headers: {
                    'X-SES-CONFIGURATION-SET': configurationSet,
                    'X-SES-MESSAGE-TAGS': tag0,
                    'X-SES-MESSAGE-TAGS': tag1
                }
            };

            // Send the email.
            let info = await transporter.sendMail(mailOptions)

            console.log("Message sent! Message ID: ", info.messageId);
        }

        main().catch(console.error);
        // --------------------------- AWS_SES

        return res.send({
            message: 'sentPw'
        })
    } catch (err) {
        return res.ststus(500).send('Server Error');
    }
};