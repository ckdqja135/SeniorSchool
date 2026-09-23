// routes/index.js:5-11 헬스체크의 동일 포팅
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    @Get()
    getHealth() {
        return {
            status: 'ok',
            message: 'Server is running',
            timestamp: new Date().toISOString()
        };
    }
}
