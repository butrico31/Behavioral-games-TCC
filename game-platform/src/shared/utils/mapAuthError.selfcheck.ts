// ponytail self-check — run with: node --experimental-strip-types src/shared/utils/mapAuthError.selfcheck.ts
// (unflagged on Node 23.6+). No test framework: repo has none, this is the "one runnable check".
import assert from 'node:assert/strict'
import { AxiosError } from 'axios'
import { mapAuthError } from './mapAuthError.ts'

const opts = { status: 401, message: 'wrong creds', fallback_message: 'auth failed' }

const matched = new AxiosError('x', undefined, undefined, undefined, { status: 401 } as never)
assert.equal(mapAuthError(matched, opts), 'wrong creds')

const server_error = new AxiosError('x', undefined, undefined, undefined, { status: 503 } as never)
assert.equal(mapAuthError(server_error, opts), 'Erro no servidor. Tente novamente mais tarde.')

const network_error = new AxiosError('x')
network_error.code = 'ERR_NETWORK'
assert.equal(mapAuthError(network_error, opts), 'Erro de conexão. Verifique se o servidor está rodando.')

const other_status = new AxiosError('x', undefined, undefined, undefined, { status: 400 } as never)
assert.equal(mapAuthError(other_status, opts), 'auth failed')

assert.equal(mapAuthError(new Error('plain'), opts), 'Erro inesperado. Tente novamente.')

const opts_with_extra = { ...opts, status_messages: { 410: 'expired', 500: 'mail down' } }
const gone = new AxiosError('x', undefined, undefined, undefined, { status: 410 } as never)
assert.equal(mapAuthError(gone, opts_with_extra), 'expired')
assert.equal(mapAuthError(server_error, opts_with_extra), 'Erro no servidor. Tente novamente mais tarde.')
const mail_down = new AxiosError('x', undefined, undefined, undefined, { status: 500 } as never)
assert.equal(mapAuthError(mail_down, opts_with_extra), 'mail down')
assert.equal(mapAuthError(matched, opts_with_extra), 'wrong creds')
assert.equal(mapAuthError(other_status, opts_with_extra), 'auth failed')

console.log('mapAuthError: ok')
