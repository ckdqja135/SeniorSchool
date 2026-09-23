/**
 * 게시판 좋아요 관련 공통 함수 — Backend/utils/boardLikeHelper.js의 Prisma 포팅.
 * 원본의 앰비언트 트랜잭션 패턴(전달받은 트랜잭션 재사용 or 자체 생성)을
 * Prisma interactive transaction(tx?: Prisma.TransactionClient)으로 재현한다.
 * 반환 형태({ message, currentLikes, action })와 에러 메시지('Board not found')는 원본과 동일.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { logger } from '../../logger/winston.logger';

// Prisma 모델 델리게이트 이름 (예: 'univBoard' → prisma.univBoard)
export type BoardModelName = string;

// 게시글 PK 컬럼은 모든 보드 테이블에서 boardIdx로 동일
@Injectable()
export class BoardLikeHelperService {
    constructor(private readonly prisma: PrismaService) {}

    private delegate(client: Prisma.TransactionClient | PrismaService, model: BoardModelName): any {
        const d = (client as any)[model];
        if (!d) throw new Error(`Unknown board model: ${model}`);
        return d;
    }

    /**
     * 게시판 좋아요 토글
     * @returns { message, currentLikes, action }
     */
    async toggleBoardLike(
        model: BoardModelName,
        boardIdx: number,
        isLiked: boolean,
        tx?: Prisma.TransactionClient,
    ): Promise<{ message: string; currentLikes: number; action: string }> {
        const run = async (client: Prisma.TransactionClient | PrismaService) => {
            // 현재 게시글 조회
            const board = await this.delegate(client, model).findFirst({
                where: { boardIdx },
                select: { boardLike: true },
            });

            if (!board) {
                throw new Error('Board not found');
            }

            // 현재 좋아요 수를 숫자로 변환
            const currentLikes = Number(board.boardLike) || 0;
            const newLikes = isLiked
                ? currentLikes + 1
                : Math.max(0, currentLikes - 1);

            // 좋아요 수 업데이트
            await this.delegate(client, model).updateMany({
                where: { boardIdx },
                data: { boardLike: newLikes },
            });

            const action = isLiked ? 'increased' : 'decreased';
            logger.info(`[toggleBoardLike] Board like ${action} for boardIdx: ${boardIdx}, Current: ${currentLikes}, New: ${newLikes}`);

            return {
                message: isLiked ? '좋아요가 추가되었습니다.' : '좋아요가 취소되었습니다.',
                currentLikes: newLikes,
                action: action,
            };
        };

        try {
            if (tx) {
                // 전달받은 트랜잭션 재사용 (커밋/롤백은 호출자 책임 — 원본과 동일)
                return await run(tx);
            }
            // 트랜잭션이 없으면 새로 생성
            return await this.prisma.$transaction(async (newTx) => run(newTx));
        } catch (error) {
            logger.error(`[toggleBoardLike] Error: ${error.message}`);
            throw error;
        }
    }

    /**
     * 게시판 좋아요 수 조회 — 게시글이 없으면 0 또는 에러(throwOnNotFound)
     */
    async getBoardLike(
        model: BoardModelName,
        boardId: number,
        options: { throwOnNotFound?: boolean } = {},
    ): Promise<number> {
        const { throwOnNotFound = false } = options;

        try {
            const board = await this.delegate(this.prisma, model).findFirst({
                where: { boardIdx: boardId },
                select: { boardLike: true },
            });

            if (!board) {
                if (throwOnNotFound) {
                    throw new Error('Board not found');
                }
                logger.warn(`[getBoardLike] Board not found for boardId: ${boardId}`);
                return 0;
            }

            const likeCount = Number(board.boardLike) || 0;
            logger.info(`[getBoardLike] Like count retrieved for boardId: ${boardId}, likes: ${likeCount}`);
            return likeCount;
        } catch (error) {
            logger.error(`[getBoardLike] Error: ${error.message}`);
            throw error;
        }
    }
}
