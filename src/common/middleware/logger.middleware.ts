/**
 * [ES] Middleware de logging. Corre ANTES que guards/pipes (es lo primero del
 * ciclo). Registra "MÉTODO URL STATUS - Xms" cuando la respuesta termina
 * (evento 'finish'), por eso conoce el status final incluso si hubo error.
 * [EN] Logs method, URL, status and duration of every request.
 */
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    // [ES] 'finish' se emite cuando la respuesta ya se envió.
    res.on('finish', () => {
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`,
      );
    });
    // [ES] next(): continúa con la siguiente etapa (guards...). Sin esto la petición se queda colgada.
    next();
  }
}
