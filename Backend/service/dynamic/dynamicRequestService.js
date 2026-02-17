const { sequelize } = require('../../model');
const logger = require('../../utils/logger');

/**
 * 추가 요청 생성
 */
exports.createRequest = async (tables, data) => {
    try {
        const { requestName, requestData, requesterId } = data;

        if (!requestName) {
            return { status: 400, message: '필수값 누락: requestName' };
        }

        const sql = `INSERT INTO ${tables.requests} (\`request_name\`, \`request_data\`, \`requester_id\`) VALUES (?, ?, ?)`;
        const params = [requestName, requestData ? JSON.stringify(requestData) : null, requesterId || null];

        const [result] = await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicRequest.create] request_idx=${result}`);
        return { status: 201, data: { requestIdx: result } };
    } catch (error) {
        logger.error(`[dynamicRequest.create] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 요청 목록 (어드민)
 */
exports.listRequests = async (tables, query) => {
    try {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;

        let whereSql = '';
        const params = [];

        if (query.status) {
            whereSql = 'WHERE `request_status` = ?';
            params.push(query.status);
        }

        const countSql = `SELECT COUNT(*) AS total FROM ${tables.requests} ${whereSql}`;
        const [countResult] = await sequelize.query(countSql, { replacements: params, type: sequelize.QueryTypes.SELECT });

        const dataSql = `SELECT * FROM ${tables.requests} ${whereSql} ORDER BY \`request_date\` DESC LIMIT ? OFFSET ?`;
        const rows = await sequelize.query(dataSql, {
            replacements: [...params, limit, offset],
            type: sequelize.QueryTypes.SELECT
        });

        const total = countResult.total;
        return {
            status: 200,
            totalCount: total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            data: rows
        };
    } catch (error) {
        logger.error(`[dynamicRequest.list] Error: ${error.message}`);
        throw error;
    }
};

/**
 * 요청 상태 변경 (어드민)
 */
exports.updateRequestStatus = async (tables, requestId, data) => {
    try {
        let { requestStatus, adminNote } = data;

        // 프론트에서 숫자로 보내는 경우 변환 (0=pending, 1=completed, 2=rejected)
        const STATUS_NUM_MAP = { 0: 'pending', 1: 'completed', 2: 'rejected' };
        if (typeof requestStatus === 'number' || /^\d+$/.test(requestStatus)) {
            requestStatus = STATUS_NUM_MAP[Number(requestStatus)] || requestStatus;
        }

        if (!requestStatus || !['completed', 'rejected', 'pending'].includes(requestStatus)) {
            return { status: 400, message: '유효하지 않은 상태값입니다.' };
        }

        const rows = await sequelize.query(
            `SELECT \`request_idx\` FROM ${tables.requests} WHERE \`request_idx\` = ?`,
            { replacements: [requestId], type: sequelize.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return { status: 404, message: '요청을 찾을 수 없습니다.' };
        }

        let sql = `UPDATE ${tables.requests} SET \`request_status\` = ?, \`processed_date\` = NOW()`;
        const params = [requestStatus];

        if (adminNote !== undefined) {
            sql += ', `admin_note` = ?';
            params.push(adminNote);
        }

        sql += ' WHERE `request_idx` = ?';
        params.push(requestId);

        await sequelize.query(sql, { replacements: params });
        logger.info(`[dynamicRequest.updateStatus] request_idx=${requestId}, status=${requestStatus}`);
        return { status: 200, message: '요청 상태가 변경되었습니다.' };
    } catch (error) {
        logger.error(`[dynamicRequest.updateStatus] Error: ${error.message}`);
        throw error;
    }
};
