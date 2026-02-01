import { Pool, PoolConfig } from 'pg';

// ============================================
// PostgreSQL Connection Pool
// ============================================

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Singleton pool
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool(poolConfig);
    _pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return _pool;
}

export const pool = {
  query: (text: string, params?: unknown[]) => getPool().query(text, params),
};

// ============================================
// Foreign Key Mappings (for relationship joins)
// ============================================

const FK_MAP: Record<string, Record<string, { table: string; pk: string }>> = {
  leads: {
    category_id: { table: 'categories', pk: 'id' },
    model_id: { table: 'models', pk: 'id' },
    sales_rep_id: { table: 'users', pk: 'id' },
    organization_id: { table: 'organizations', pk: 'id' },
    reviewed_by: { table: 'users', pk: 'id' },
  },
  users: {
    organization_id: { table: 'organizations', pk: 'id' },
    manager_id: { table: 'users', pk: 'id' },
  },
  categories: {
    organization_id: { table: 'organizations', pk: 'id' },
  },
  models: {
    organization_id: { table: 'organizations', pk: 'id' },
    category_id: { table: 'categories', pk: 'id' },
  },
  offer_leads: {
    organization_id: { table: 'organizations', pk: 'id' },
    sales_rep_id: { table: 'users', pk: 'id' },
    converted_to_lead_id: { table: 'leads', pk: 'id' },
  },
  whatsapp_credentials: {
    organization_id: { table: 'organizations', pk: 'id' },
  },
  whatsapp_message_logs: {
    organization_id: { table: 'organizations', pk: 'id' },
    lead_id: { table: 'leads', pk: 'id' },
    user_id: { table: 'users', pk: 'id' },
  },
};

// ============================================
// Query Builder (Supabase-compatible API)
// ============================================

interface JoinDef {
  alias: string;
  table: string;
  fkColumn: string;
  pk: string;
  columns: string[];
}

interface WhereClause {
  column: string;
  op: string;
  value: unknown;
  paramIndex?: number;
}

interface OrderDef {
  column: string;
  ascending: boolean;
}

interface SelectOptions {
  count?: 'exact';
  head?: boolean;
}

type Operation = 'select' | 'insert' | 'update' | 'delete';

class QueryBuilder {
  private _table = '';
  private _operation: Operation = 'select';
  private _selectColumns = '*';
  private _selectOptions: SelectOptions = {};
  private _joins: JoinDef[] = [];
  private _wheres: WhereClause[] = [];
  private _orders: OrderDef[] = [];
  private _limitVal?: number;
  private _insertData?: any | any[];
  private _updateData?: any;
  private _returning = false;
  private _returnColumns = '*';

  from(table: string): QueryBuilder {
    const qb = new QueryBuilder();
    qb._table = table;
    return qb;
  }

  select(columns?: string, options?: SelectOptions): QueryBuilder {
    if (this._operation === 'insert' || this._operation === 'update') {
      // .insert({}).select() or .update({}).select() — means RETURNING
      this._returning = true;
      if (columns && columns !== '*') {
        this._returnColumns = columns;
      }
      return this;
    }
    this._operation = 'select';
    this._selectOptions = options || {};
    if (columns) {
      this._parseSelect(columns);
    }
    return this;
  }

  private _parseSelect(columns: string): void {
    // Parse Supabase-style select with relations:
    // "*, categories(name), models(name), users!sales_rep_id(id, name)"
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of columns) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (char === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());

    const plainCols: string[] = [];

    for (const part of parts) {
      // Check for relation pattern: table(cols) or table!fk(cols)
      const relationMatch = part.match(/^(\w+)(?:!(\w+))?\(([^)]+)\)$/);
      if (relationMatch) {
        const [, relTable, fkHint, relCols] = relationMatch;
        const cols = relCols.split(',').map(c => c.trim());

        // Find FK column
        let fkColumn = '';
        const tableFKs = FK_MAP[this._table] || {};

        if (fkHint) {
          // Explicit FK: users!sales_rep_id(id, name)
          fkColumn = fkHint;
        } else {
          // Find FK by target table name
          for (const [fk, def] of Object.entries(tableFKs)) {
            if (def.table === relTable) {
              fkColumn = fk;
              break;
            }
          }
        }

        if (fkColumn && tableFKs[fkColumn]) {
          const alias = fkHint ? `${relTable}_${fkHint}` : relTable;
          this._joins.push({
            alias,
            table: tableFKs[fkColumn].table,
            fkColumn,
            pk: tableFKs[fkColumn].pk,
            columns: cols,
          });
        }
      } else {
        plainCols.push(part);
      }
    }

    this._selectColumns = plainCols.length > 0 ? plainCols.join(', ') : '*';
  }

  insert(data: any | any[]): QueryBuilder {
    this._operation = 'insert';
    this._insertData = data;
    return this;
  }

  update(data: any): QueryBuilder {
    this._operation = 'update';
    this._updateData = data;
    return this;
  }

  delete(): QueryBuilder {
    this._operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '=', value });
    return this;
  }

  neq(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '!=', value });
    return this;
  }

  in(column: string, values: unknown[]): QueryBuilder {
    this._wheres.push({ column, op: 'IN', value: values });
    return this;
  }

  gte(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '>=', value });
    return this;
  }

  gt(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '>', value });
    return this;
  }

  lte(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '<=', value });
    return this;
  }

  lt(column: string, value: unknown): QueryBuilder {
    this._wheres.push({ column, op: '<', value });
    return this;
  }

  is(column: string, value: null): QueryBuilder {
    if (value === null) {
      this._wheres.push({ column, op: 'IS NULL', value: null });
    }
    return this;
  }

  not(column: string, operator: string, value: unknown): QueryBuilder {
    if (operator === 'is' && value === null) {
      this._wheres.push({ column, op: 'IS NOT NULL', value: null });
    } else if (operator === 'like') {
      this._wheres.push({ column, op: 'NOT LIKE', value });
    } else {
      this._wheres.push({ column, op: `NOT ${operator}`, value });
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder {
    this._orders.push({
      column,
      ascending: options?.ascending ?? true,
    });
    return this;
  }

  limit(n: number): QueryBuilder {
    this._limitVal = n;
    return this;
  }

  // Terminal methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async single(): Promise<{ data: any | null; error: Error | null; count?: number }> {
    const result = await this._execute();
    if (result.error) return result;
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return { data: null, error: new Error('No rows found'), count: result.count };
    }
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: row, error: null, count: result.count };
  }

  async maybeSingle(): Promise<{ data: any | null; error: Error | null; count?: number }> {
    const result = await this._execute();
    if (result.error) return result;
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return { data: null, error: null, count: result.count };
    }
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: row, error: null, count: result.count };
  }

  // Default execution (returns array)
  then(
    resolve: (value: { data: any[] | null; error: Error | null; count?: number }) => void,
    reject?: (reason: unknown) => void
  ): void {
    this._execute().then(resolve, reject);
  }

  // ============================================
  // SQL Generation & Execution
  // ============================================

  private async _execute(): Promise<{ data: any[] | null; error: Error | null; count?: number }> {
    try {
      const p = getPool();

      switch (this._operation) {
        case 'select':
          return await this._executeSelect(p);
        case 'insert':
          return await this._executeInsert(p);
        case 'update':
          return await this._executeUpdate(p);
        case 'delete':
          return await this._executeDelete(p);
        default:
          return { data: null, error: new Error(`Unknown operation: ${this._operation}`) };
      }
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  private async _executeSelect(p: Pool): Promise<{ data: any[] | null; error: Error | null; count?: number }> {
    const params: unknown[] = [];
    let paramIdx = 1;

    // Handle count-only queries
    if (this._selectOptions.head && this._selectOptions.count === 'exact') {
      let sql = `SELECT COUNT(*) as count FROM ${this._table}`;
      const { whereClause, newIdx } = this._buildWhere(params, paramIdx);
      paramIdx = newIdx;
      sql += whereClause;

      const result = await p.query(sql, params);
      const count = parseInt(result.rows[0]?.count || '0', 10);
      return { data: null, error: null, count };
    }

    // Build SELECT with joins
    let selectParts: string[] = [];
    if (this._selectColumns === '*') {
      selectParts.push(`${this._table}.*`);
    } else {
      // Prefix plain columns with table name
      selectParts = this._selectColumns.split(',').map(c => {
        const col = c.trim();
        if (col === '*') return `${this._table}.*`;
        if (col.includes('.')) return col;
        return `${this._table}.${col}`;
      });
    }

    // Add join columns
    for (const join of this._joins) {
      for (const col of join.columns) {
        selectParts.push(`${join.alias}.${col} AS __join_${join.alias}_${col}`);
      }
    }

    let sql = `SELECT ${selectParts.join(', ')} FROM ${this._table}`;

    // Add JOINs
    for (const join of this._joins) {
      sql += ` LEFT JOIN ${join.table} AS ${join.alias} ON ${this._table}.${join.fkColumn} = ${join.alias}.${join.pk}`;
    }

    // WHERE
    const { whereClause, newIdx } = this._buildWhere(params, paramIdx);
    paramIdx = newIdx;
    sql += whereClause;

    // ORDER BY
    if (this._orders.length > 0) {
      const orderParts = this._orders.map(o => `${this._table}.${o.column} ${o.ascending ? 'ASC' : 'DESC'}`);
      sql += ` ORDER BY ${orderParts.join(', ')}`;
    }

    // LIMIT
    if (this._limitVal !== undefined) {
      sql += ` LIMIT ${this._limitVal}`;
    }

    const result = await p.query(sql, params);

    // Transform rows: nest join results into objects
    const data = result.rows.map(row => this._nestJoins(row));

    return { data, error: null };
  }

  private async _executeInsert(p: Pool): Promise<{ data: any[] | null; error: Error | null }> {
    if (!this._insertData) return { data: null, error: new Error('No insert data') };

    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
    if (rows.length === 0) return { data: [], error: null };

    const columns = Object.keys(rows[0]);
    const params: unknown[] = [];
    let paramIdx = 1;

    const valueSets: string[] = [];
    for (const row of rows) {
      const placeholders: string[] = [];
      for (const col of columns) {
        const val = row[col];
        // Handle JSONB: serialize objects/arrays
        if (val !== null && val !== undefined && typeof val === 'object' && !(val instanceof Date)) {
          params.push(JSON.stringify(val));
        } else {
          params.push(val);
        }
        placeholders.push(`$${paramIdx++}`);
      }
      valueSets.push(`(${placeholders.join(', ')})`);
    }

    const returning = this._returning ? ` RETURNING ${this._returnColumns}` : ' RETURNING *';
    const sql = `INSERT INTO ${this._table} (${columns.join(', ')}) VALUES ${valueSets.join(', ')}${returning}`;

    const result = await p.query(sql, params);
    return { data: result.rows, error: null };
  }

  private async _executeUpdate(p: Pool): Promise<{ data: any[] | null; error: Error | null }> {
    if (!this._updateData) return { data: null, error: new Error('No update data') };

    const params: unknown[] = [];
    let paramIdx = 1;

    const setParts: string[] = [];
    for (const [col, val] of Object.entries(this._updateData)) {
      if (val !== null && val !== undefined && typeof val === 'object' && !(val instanceof Date)) {
        params.push(JSON.stringify(val));
      } else {
        params.push(val);
      }
      setParts.push(`${col} = $${paramIdx++}`);
    }

    let sql = `UPDATE ${this._table} SET ${setParts.join(', ')}`;

    const { whereClause, newIdx } = this._buildWhere(params, paramIdx);
    paramIdx = newIdx;
    sql += whereClause;

    if (this._returning) {
      sql += ` RETURNING ${this._returnColumns}`;
    } else {
      sql += ' RETURNING *';
    }

    const result = await p.query(sql, params);
    return { data: result.rows, error: null };
  }

  private async _executeDelete(p: Pool): Promise<{ data: any[] | null; error: Error | null }> {
    const params: unknown[] = [];
    let paramIdx = 1;

    let sql = `DELETE FROM ${this._table}`;

    const { whereClause, newIdx } = this._buildWhere(params, paramIdx);
    paramIdx = newIdx;
    sql += whereClause;

    sql += ' RETURNING *';

    const result = await p.query(sql, params);
    return { data: result.rows, error: null };
  }

  private _buildWhere(params: unknown[], startIdx: number): { whereClause: string; newIdx: number } {
    if (this._wheres.length === 0) return { whereClause: '', newIdx: startIdx };

    let idx = startIdx;
    const parts: string[] = [];

    for (const w of this._wheres) {
      if (w.op === 'IS NULL' || w.op === 'IS NOT NULL') {
        parts.push(`${this._table}.${w.column} ${w.op}`);
      } else if (w.op === 'IN') {
        const values = w.value as unknown[];
        if (values.length === 0) {
          parts.push('FALSE');
        } else {
          const placeholders = values.map(v => {
            params.push(v);
            return `$${idx++}`;
          });
          parts.push(`${this._table}.${w.column} IN (${placeholders.join(', ')})`);
        }
      } else if (w.op === 'NOT LIKE') {
        params.push(w.value);
        parts.push(`${this._table}.${w.column} NOT LIKE $${idx++}`);
      } else {
        params.push(w.value);
        parts.push(`${this._table}.${w.column} ${w.op} $${idx++}`);
      }
    }

    return { whereClause: ` WHERE ${parts.join(' AND ')}`, newIdx: idx };
  }

  private _nestJoins(row: any): any {
    if (this._joins.length === 0) return row;

    const result: any = {};
    const joinData: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const joinMatch = key.match(/^__join_(\w+)_(\w+)$/);
      if (joinMatch) {
        const [, alias, col] = joinMatch;
        if (!joinData[alias]) joinData[alias] = {};
        joinData[alias][col] = value;
      } else {
        result[key] = value;
      }
    }

    // Nest join data under their original table names
    for (const join of this._joins) {
      const data = joinData[join.alias];
      // Use the original table name as key (matches Supabase behavior)
      // For aliased joins like users!sales_rep_id, use the table name "users"
      const key = join.table;
      if (data) {
        // Check if all values are null (no matching row)
        const allNull = Object.values(data).every(v => v === null);
        result[key] = allNull ? null : data;
      } else {
        result[key] = null;
      }
    }

    return result;
  }
}

// ============================================
// RPC Support
// ============================================

class DatabaseClient {
  from(table: string): QueryBuilder {
    const qb = new QueryBuilder();
    return qb.from(table);
  }

  async rpc(functionName: string, params?: any): Promise<{ data: unknown; error: Error | null }> {
    try {
      const p = getPool();

      if (functionName === 'exec_sql') {
        // Special case: execute raw SQL
        const sql = params?.sql as string;
        const sqlParams = params?.params as unknown[] | undefined;
        const result = await p.query(sql, sqlParams || []);
        return { data: result.rows, error: null };
      }

      // Generic RPC: SELECT * FROM function_name(param1, param2, ...)
      const paramEntries = params ? Object.entries(params) : [];
      const placeholders = paramEntries.map((_, i) => `$${i + 1}`);
      const values = paramEntries.map(([, v]) => v);

      const sql = `SELECT * FROM ${functionName}(${placeholders.join(', ')})`;
      const result = await p.query(sql, values);
      return { data: result.rows, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }
}

// ============================================
// Exports
// ============================================

export const db = new DatabaseClient();
