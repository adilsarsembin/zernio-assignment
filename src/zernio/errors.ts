import {
  BadGatewayException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RateLimitError, ZernioApiError } from '@zernio/node';

const logger = new Logger('Zernio');

export function toHttp(err: unknown): HttpException {
  if (err instanceof RateLimitError) {
    return new ServiceUnavailableException({
      statusCode: 503,
      message: 'Zernio rate limit reached',
      retryAfter: err.getSecondsUntilReset(),
    });
  }
  if (err instanceof ZernioApiError) {
    if (err.code === 'platform_api_error') {
      return new UnprocessableEntityException(
        `Meta rejected the budget: ${err.message}`,
      );
    }
    if (
      err.code === 'ads_connection_required' ||
      err.code === 'account_disconnected'
    ) {
      return new ConflictException(
        'Meta account disconnected, reconnect required',
      );
    }
    if (err.statusCode === 404) {
      return new ConflictException('Campaign not found on Zernio');
    }
    if (err.statusCode === 409) {
      return new ConflictException('Budget is managed at ad-set level');
    }
    logger.error(`${err.statusCode} ${err.code ?? 'unknown'}: ${err.message}`);
    return new BadGatewayException('Zernio request failed');
  }
  if (err instanceof Error && err.name === 'TimeoutError') {
    return new GatewayTimeoutException(
      'Zernio timed out, budget may or may not be updated',
    );
  }
  if (err instanceof TypeError) {
    logger.error(`unreachable: ${err.message}`);
    return new BadGatewayException('Zernio unreachable');
  }
  throw err;
}
