import {type GeneratedAlways, Kysely, CamelCasePlugin} from 'kysely'
import {PostgresJSDialect} from 'kysely-postgres-js'
import {DB} from './schema'
import postgres from 'postgres'

export const db = new Kysely<DB>({
  dialect: new PostgresJSDialect({
    postgres: postgres(process.env.DATABASE_URL as string)
  }),
  plugins: [new CamelCasePlugin()],
})
