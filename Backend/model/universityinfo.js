const Sequelize = require("sequelize");

module.exports = class UniversityInfo extends Sequelize.Model {
    static init(sequelize) {
        return super.init(
            {
                univIdx: {
                    type: Sequelize.INTEGER,
                    primaryKey: true,
                    autoIncrement: true,
                    allowNull: false,
                },
                univName: {
                    type: Sequelize.STRING(60),
                    allowNull: false,
                },
                univLocate: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                univType: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                univEstablish: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                univPresident: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                univCampos: {
                    type: Sequelize.STRING(45),
                    allowNull: false,
                },
                univLateX: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                univLateY: {
                    type: Sequelize.DOUBLE,
                    allowNull: false,
                },
                univURL: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                univLotAddr: {
                    type: Sequelize.STRING(20),
                    allowNull: false,
                },
                univAddr: {
                    type: Sequelize.STRING(200),
                    allowNull: false,
                },
                univMapIMG: {
                    type: Sequelize.STRING(200),
                    allowNull: true,
                },
                univStatus: {
                    type: Sequelize.TINYINT,
                    allowNull: false,
                    defaultValue: 1,
                },
                univViewCount: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                },
                createdAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'created_at',
                    comment: '등록일'
                },
                updatedAt: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.NOW,
                    field: 'updated_at',
                    comment: '수정일'
                },
            },
            {
                sequelize,
                modelName: "UniversityInfo",
                tableName: "tb_universityinfo",
                charset: "utf8",
                timestamps: false,
            }
        );
    }

    static associate(db) {
        // UniversityInfo와 UnivBoard 간의 관계 설정
        db.University.hasMany(db.UnivBoard, { 
            foreignKey: "univIdx", 
            sourceKey: "univIdx" 
        });
    }
};
