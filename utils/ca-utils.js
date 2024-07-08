const fs = require('fs');
const path = require('path');

exports.buildCCP = (org) => {
  // load the common connection configuration file
  let ccpPath = {}

  switch (org) {
    case 'nsmarts':
      ccpPath = path.resolve(__dirname, 'connection-profile', 'connection-nsmarts.json');
      break;
    case 'vice':
      ccpPath = path.resolve(__dirname, 'connection-profile', 'connection-vice.json');
      break;
    case 'vice-kr':
      ccpPath = path.resolve(__dirname, 'connection-profile', 'connection-vice-kr.json');
      break;
  }
  console.log("ccpPath>>>> ", ccpPath)
  const fileExists = fs.existsSync(ccpPath);
  if (!fileExists) {
    throw new Error(`no such file or directory: ${ccpPath}`);
  }
  const contents = fs.readFileSync(ccpPath, 'utf8');

  // build a JSON object from the file contents
  const ccp = JSON.parse(contents);
  console.log(`Loaded the network configuration located at ${ccpPath}`)
  // logger.info(`Loaded the network configuration located at ${ccpPath}`);
  return ccp;
};

exports.buildCAClient = (FabricCAServices, ccp, caHostName) => {
  const caInfo = ccp.certificateAuthorities[caHostName]; //lookup CA details from config
  console.log(caInfo)
  const caTLSCACerts = caInfo.tlsCACerts.pem;

  const caClient = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);
  // console.log('caName : ', caInfo.caName)
  // logger.info(`Built a CA Client named ${caInfo.caName}`);
  return caClient;
};


exports.registerAndEnrollUserMongo = async (caClient, wallet, orgMspId, userId, affiliation) => {
  try {
    // logger.info("---register user start--", userId.toString())
    // Check to see if we've already enrolled the user
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      // logger.debug(`An identity for the user ${userId} already exists in the wallet`);
      return "User already present";
    }

    // Must use an admin to register a new user
    const adminIdentity = await wallet.get(blockchainConst.caAdmin);
    // console.log("-----adminIdentity ", adminIdentity)
    if (!adminIdentity) {
      console.log('An identity for the admin user does not exist in the wallet');
      console.log('Enroll the admin user before retrying');
      return;
    }

    // build a user object for authenticating with the CA
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, blockchainConst.caAdmin);

    // Register the user, enroll the user, and import the new identity into the wallet.
    // if affiliation is specified by client, the affiliation value must be configured in CA
    const secret = await caClient.register({
      affiliation: affiliation,
      enrollmentID: userId,
      role: 'client'
    }, adminUser);
    const enrollment = await caClient.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgMspId,
      type: 'X.509',
    };
    let data = {
      role: "client",
      email: userId,

      certificate: x509Identity,
      "mspId": orgMspId,
      credentials: x509Identity.credentials,
      version: 1,
      type: 'X.509'
    }
    // // logger.info("---dtafrom gdter user--")
    const putData = await wallet.put(userId, data);
    // console.log("putdata register user : putData", putData)
    // logger.debug(`Successfully registered and enrolled user ${userId} and imported it into the wallet`);
  } catch (error) {
    await global.DB_MODELS.User.findByIdAndDelete(userId);

    // logger.error(`Failed to register user : ${error}`);
    return error
  }
};

/**
* 
* @param {*} caClient 
* @param {*} wallet 
* @param {*} mspId 
* @param {*} userId 
* @returns 
*/
exports.enrollAdminMongo = async (caClient, wallet, mspId, userId) => {
  try {
    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get(userId);
    if (identity) {
      console.log('An identity for the admin user already exists in the wallet');
      return;
    }

    console.log("Admin Identity not found... Enroll admin")

    // Enroll the admin user, and import the new identity into the wallet.
    const enrollment = await caClient.enroll({
      enrollmentID: process.env.ADMIN_USER_ID,
      enrollmentSecret: process.env.ADMIN_USER_PASS
    });

    const data = {
      admin: userId,
      mspId: mspId,
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      version: 1,
      type: 'X.509'
    }

    console.log("Putting data into wallet for user ID:", userId);

    await wallet.put(userId, data);
    console.log('Successfully enrolled admin user and imported it into the wallet');
  } catch (error) {
    console.log(error)
    await global.DB_MODELS.Admin.findByIdAndDelete(userId);
    console.error(`Failed to enroll admin user : ${error}`);
  }
};


exports.userExist = async (wallet, userId) => {
  console.log("userExist: wallet path", wallet)
  const identity = await wallet.get(userId);
  if (!identity) {
    throw new Error("Identity not exist ")
  }
  return true;
}