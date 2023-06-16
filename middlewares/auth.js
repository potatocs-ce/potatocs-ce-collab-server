const { verifyToken } = require('./libraries/token');

/**
 * Token 유효성 검증
 */
exports.isAuthenticated = (req, res, next) => {
	// 토큰 취득
	const token = req.body.token || req.query.token || req.headers.authorization;
	// const token = req.body.token || req.query.token || req.headers.authorization.split(' ')[1];

	// 토큰 미존재: 로그인하지 않은 사용자
	if (!token) {
		return res.status(403).send('토큰이 존재하지 않습니다');
	}

	// Bearer 부분 추출
	const bearer = token.split(" ");
	const bearerToken = bearer[1];

	verifyToken(bearerToken).then(decoded => {
		req.decoded = decoded;
		next();
	}).catch(err => {
		console.log('verify token error!!');
		res.status(403).send(err.message);
	});
};


