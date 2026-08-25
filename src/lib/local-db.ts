import "server-only";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { countryCode, formatCustomerCode } from "./customer-code";
import { formatSupplierCode, supplierCodePrefix } from "./supplier-code";

let instance: Database.Database | undefined;
export const isLocalMode = () =>
  process.env.APP_MODE === "local" || !process.env.NEXT_PUBLIC_SUPABASE_URL;

export function localDb() {
  if (instance) return instance;
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "anne-crm.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    create table if not exists users(id text primary key,email text unique not null,password_hash text not null,full_name text not null,role text not null,created_at text default current_timestamp);
    create table if not exists customers(id text primary key,customer_code text unique,company_name text not null,country text,stage text,grade text,source text,next_follow_up_at text,notes text,created_at text default current_timestamp,deleted_at text);
    create table if not exists products(id text primary key,product_code text unique,product_name text not null,category text,material text,capacity_value real,capacity_unit text,neck_size text,product_status text,purchase_unit_price_cny real,purchase_notes text,primary_supplier_id text,purchase_moq integer,delivery_lead_time_days integer,special_notes text,created_at text default current_timestamp,deleted_at text);
    create table if not exists suppliers(id text primary key,supplier_code text unique,company_name text not null,supplier_type text,standard_moq integer,lead_time_days integer,total_score real,grade text,status text,created_at text default current_timestamp,deleted_at text);
    create table if not exists opportunities(id text primary key,opportunity_code text,title text,customer_id text,status text,project_progress text,estimated_amount real,currency text,expected_close_date text,created_at text default current_timestamp,deleted_at text);
    create table if not exists follow_ups(id text primary key,customer_id text,opportunity_id text,channel text,content text not null,result text,followed_at text not null,created_at text default current_timestamp,deleted_at text);
    create table if not exists tasks(id text primary key,title text,task_type text,customer_id text,opportunity_id text,due_at text,priority text,status text,auto_rule text,created_at text default current_timestamp,deleted_at text);
    create table if not exists orders(id text primary key,order_number text,customer_id text,order_categories text,status text,order_date text,sales_amount real,sales_currency text,revenue_cny real,total_cost_cny real,net_profit_cny real,profit_margin real,created_at text default current_timestamp,deleted_at text);
    create table if not exists financial_records(id text primary key,record_type text not null,category text,counterparty text,amount real not null,currency text not null,amount_cny real not null,occurred_at text not null,status text,notes text,created_at text default current_timestamp,deleted_at text);
    create table if not exists lark_connections(id text primary key,name text not null,app_id text not null,app_secret_encrypted text not null,base_token text not null,table_id text not null,field_mapping text not null,last_synced_at text,created_at text default current_timestamp,updated_at text default current_timestamp);
    create table if not exists lark_sync_runs(id text primary key,connection_id text not null,status text not null,total_records integer default 0,created_records integer default 0,updated_records integer default 0,failed_records integer default 0,error_message text,started_at text default current_timestamp,completed_at text);
  `);
  const customerColumns = db.prepare("pragma table_info(customers)").all() as {
    name: string;
  }[];
  const supplierColumns = db.prepare("pragma table_info(suppliers)").all() as { name: string }[];
  if (!supplierColumns.some((column) => column.name === "location"))
    db.exec("alter table suppliers add column location text");
  const productColumns = db.prepare("pragma table_info(products)").all() as {
    name: string;
  }[];
  if (!productColumns.some((c) => c.name === "image_path"))
    db.exec("alter table products add column image_path text");
  if (!productColumns.some((c) => c.name === "purchase_unit_price_cny"))
    db.exec("alter table products add column purchase_unit_price_cny real");
  if (!productColumns.some((c) => c.name === "purchase_notes"))
    db.exec("alter table products add column purchase_notes text");
  if (!productColumns.some((c) => c.name === "primary_supplier_id"))
    db.exec("alter table products add column primary_supplier_id text");
  if (!productColumns.some((c) => c.name === "purchase_moq"))
    db.exec("alter table products add column purchase_moq integer");
  if (!productColumns.some((c) => c.name === "delivery_lead_time_days"))
    db.exec("alter table products add column delivery_lead_time_days integer");
  if (!productColumns.some((c) => c.name === "special_notes"))
    db.exec("alter table products add column special_notes text");
  const financeColumns = db
    .prepare("pragma table_info(financial_records)")
    .all() as { name: string }[];
  for (const name of [
    "order_id",
    "order_revenue_cny",
    "product_cost_cny",
    "freight_cny",
    "miscellaneous_cny",
    "other_cost_cny",
    "total_cost_cny",
    "calculated_profit_cny",
    "profit_margin",
  ])
    if (!financeColumns.some((c) => c.name === name))
      db.exec(`alter table financial_records add column ${name} real`);
  const orderColumns = db.prepare("pragma table_info(orders)").all() as {
    name: string;
  }[];
  if (!orderColumns.some((column) => column.name === "order_categories"))
    db.exec("alter table orders add column order_categories text");
  const opportunityColumns = db
    .prepare("pragma table_info(opportunities)")
    .all() as { name: string }[];
  if (!opportunityColumns.some((column) => column.name === "project_progress"))
    db.exec("alter table opportunities add column project_progress text");
  const taskColumns = db.prepare("pragma table_info(tasks)").all() as {
    name: string;
  }[];
  if (!taskColumns.some((column) => column.name === "opportunity_id"))
    db.exec("alter table tasks add column opportunity_id text");
  if (!customerColumns.some((c) => c.name === "lark_record_id"))
    db.exec("alter table customers add column lark_record_id text");
  if (!customerColumns.some((c) => c.name === "lark_updated_at"))
    db.exec("alter table customers add column lark_updated_at text");
  const extraCustomerColumns = [
    "customer_type",
    "business_products",
    "inquiry_grade",
    "email_content",
    "contact_name",
    "email",
    "position",
    "social_media",
    "phone",
    "latest_result",
    "next_action",
    "follow_up_reminder",
    "follow_up_checkin",
    "background_summary",
    "company_size",
    "website",
    "last_follow_up_at",
    "lark_created_at",
  ];
  for (const name of extraCustomerColumns)
    if (!customerColumns.some((c) => c.name === name))
      db.exec(`alter table customers add column ${name} text`);
  const connectionColumns = db
    .prepare("pragma table_info(lark_connections)")
    .all() as { name: string }[];
  if (!connectionColumns.some((c) => c.name === "region"))
    db.exec(
      "alter table lark_connections add column region text default 'lark'",
    );
  const syncRunColumns = db
    .prepare("pragma table_info(lark_sync_runs)")
    .all() as { name: string }[];
  if (!syncRunColumns.some((c) => c.name === "failure_details"))
    db.exec("alter table lark_sync_runs add column failure_details text");
  if (!syncRunColumns.some((c) => c.name === "skipped_records"))
    db.exec("alter table lark_sync_runs add column skipped_records integer default 0");
  if (!syncRunColumns.some((c) => c.name === "unchanged_records"))
    db.exec("alter table lark_sync_runs add column unchanged_records integer default 0");
  db.exec(
    "create unique index if not exists customers_lark_record on customers(lark_record_id) where lark_record_id is not null",
  );
  db.exec(
    "create unique index if not exists customers_company_name_active on customers(lower(trim(company_name))) where deleted_at is null",
  );
  seedLocal(db);
  migrateCustomerCodes(db);
  migrateSupplierCodes(db);
  repairCustomerReferences(db);
  instance = db;
  return db;
}

function repairCustomerReferences(db: Database.Database) {
  const findActive = db.prepare(`
    select active.id
    from customers old
    join customers active
      on lower(trim(active.company_name))=lower(trim(old.company_name))
     and active.deleted_at is null
    where old.id=? and old.deleted_at is not null
    limit 1
  `);
  db.transaction(() => {
    for (const table of ["opportunities", "tasks", "orders", "follow_ups"]) {
      const rows = db.prepare(`
        select x.id,x.customer_id
        from ${table} x
        join customers c on c.id=x.customer_id
        where x.deleted_at is null and c.deleted_at is not null
      `).all() as { id: string; customer_id: string }[];
      const update = db.prepare(`update ${table} set customer_id=? where id=?`);
      for (const row of rows) {
        const active = findActive.get(row.customer_id) as { id: string } | undefined;
        if (active) update.run(active.id, row.id);
      }
    }
  })();
}

function migrateSupplierCodes(db: Database.Database) {
  const rows = db.prepare("select id,company_name,location,deleted_at from suppliers order by case when deleted_at is null then 0 else 1 end,created_at,id").all() as { id: string; company_name: string; location: string | null; deleted_at: string | null }[];
  const update = db.prepare("update suppliers set supplier_code=? where id=?");
  db.transaction(() => {
    rows.forEach((row, index) => update.run(`TMP-SUP-${index}-${row.id}`, row.id));
    rows.forEach((row, index) =>
      update.run(formatSupplierCode(supplierCodePrefix(row.location, row.company_name), index + 1), row.id),
    );
  })();
}

export function localNextSupplierCode(location: unknown, companyName: unknown) {
  const rows = localDb().prepare("select supplier_code from suppliers").all() as { supplier_code: string }[];
  const max = rows.reduce((value, row) => {
    const match = row.supplier_code.match(/(\d+)$/);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return formatSupplierCode(supplierCodePrefix(location, companyName), max + 1);
}

function migrateCustomerCodes(db: Database.Database) {
  const rows = db
    .prepare("select id,country,customer_code,deleted_at from customers order by case when deleted_at is null then 0 else 1 end,created_at,id")
    .all() as { id: string; country: string | null; customer_code: string | null; deleted_at: string | null }[];
  const sequences = rows.map((row) =>
    Number(row.customer_code?.match(/^[A-Z]{2}(\d{3,})$/)?.[1] || 0),
  );
  const activeSequences = rows
    .filter((row) => !row.deleted_at)
    .map((row) => Number(row.customer_code?.match(/^[A-Z]{2}(\d{3,})$/)?.[1] || 0))
    .sort((a, b) => a - b);
  if (sequences.every(Boolean) && new Set(sequences).size === rows.length &&
      activeSequences.every((value, index) => value === index + 1)) return;
  const update = db.prepare("update customers set customer_code=? where id=?");
  db.transaction(() => {
    rows.forEach((row, index) => update.run(`TMP-${index}-${row.id}`, row.id));
    rows.forEach((row, index) =>
      update.run(formatCustomerCode(countryCode(row.country), index + 1), row.id),
    );
  })();
}

export function localNextCustomerCode(country: unknown) {
  const db = localDb(), prefix = countryCode(country);
  const rows = db
    .prepare("select customer_code from customers")
    .all() as { customer_code: string }[];
  const max = rows.reduce((value, row) => {
    const match = row.customer_code.match(/^[A-Z]{2}(\d+)$/);
    return Math.max(value, match ? Number(match[1]) : 0);
  }, 0);
  return formatCustomerCode(prefix, max + 1);
}

function seedLocal(db: Database.Database) {
  const email = process.env.LOCAL_ADMIN_EMAIL || "anne@example.com",
    password = process.env.LOCAL_ADMIN_PASSWORD;
  if (!password) throw new Error("本地模式缺少 LOCAL_ADMIN_PASSWORD");
  db.prepare(
    "insert or ignore into users(id,email,password_hash,full_name,role) values(?,?,?,?,?)",
  ).run(
    crypto.randomUUID(),
    email,
    bcrypt.hashSync(password, 10),
    "管理员 Anne",
    "admin",
  );
  const count = (
    db.prepare("select count(*) n from customers").get() as { n: number }
  ).n;
  if (count) return;
  const countries = [
      "美国",
      "英国",
      "法国",
      "德国",
      "澳大利亚",
      "加拿大",
      "阿联酋",
      "新加坡",
    ],
    stages = [
      "有明确询盘",
      "已报价",
      "样品已寄",
      "价格谈判",
      "等待订单",
      "已成交",
    ];
  const addCustomer = db.prepare(
    "insert into customers(id,customer_code,company_name,country,stage,grade,source,next_follow_up_at,notes,created_at) values(?,?,?,?,?,?,?,?,?,?)",
  );
  const customerIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const id = crypto.randomUUID();
    customerIds.push(id);
    addCustomer.run(
      id,
      `CUS-${String(i + 1).padStart(4, "0")}`,
      `Demo Beauty ${String.fromCharCode(65 + i)} Ltd.`,
      countries[i % countries.length],
      stages[i % stages.length],
      ["A", "B", "C"][i % 3],
      ["Google", "展会", "LinkedIn", "转介绍"][i % 4],
      i < 6 ? new Date(Date.now() + (i - 3) * 86400000).toISOString() : null,
      "虚构演示客户",
      new Date().toISOString(),
    );
  }
  const categories = [
    "PET瓶",
    "真空瓶",
    "膏霜罐",
    "化妆品软管",
    "乳液泵",
    "喷雾泵",
    "纸盒",
    "礼品盒",
    "美妆工具",
    "酒店洗护包装",
  ];
  const addProduct = db.prepare(
    "insert into products(id,product_code,product_name,category,material,capacity_value,capacity_unit,neck_size,product_status,created_at) values(?,?,?,?,?,?,?,?,?,?)",
  );
  for (let i = 0; i < 50; i++)
    addProduct.run(
      crypto.randomUUID(),
      `PRD-2026-${String(i + 1).padStart(4, "0")}`,
      `${categories[i % categories.length]} ${30 + (i % 10) * 20}ml`,
      categories[i % categories.length],
      ["PET", "PP", "HDPE", "PETG", "PCR"][i % 5],
      30 + (i % 10) * 20,
      "ml",
      ["18/410", "20/410", "24/410"][i % 3],
      i % 5 === 0 ? "已验证" : "可推荐",
      new Date().toISOString(),
    );
  const addSupplier = db.prepare(
    "insert into suppliers(id,supplier_code,company_name,supplier_type,standard_moq,lead_time_days,total_score,grade,status,created_at) values(?,?,?,?,?,?,?,?,?,?)",
  );
  for (let i = 0; i < 10; i++)
    addSupplier.run(
      crypto.randomUUID(),
      `SUP-${String(i + 1).padStart(3, "0")}`,
      `优选包装供应商 ${i + 1} 号`,
      i < 4 ? "核心供应商" : "常规供应商",
      10000,
      20 + i,
      72 + i,
      ["B", "A"][Number(i > 6)],
      "可合作",
      new Date().toISOString(),
    );
  const addOpp = db.prepare(
    "insert into opportunities(id,opportunity_code,title,customer_id,status,estimated_amount,currency,expected_close_date,created_at) values(?,?,?,?,?,?,?,?,?)",
  );
  for (let i = 0; i < 15; i++)
    addOpp.run(
      crypto.randomUUID(),
      `OPP-${String(i + 1).padStart(3, "0")}`,
      `2026 包装项目 ${i + 1}`,
      customerIds[i % 20],
      stages[i % stages.length],
      5000 + i * 1250,
      "USD",
      new Date(Date.now() + (i + 10) * 86400000).toISOString().slice(0, 10),
      new Date().toISOString(),
    );
  const addTask = db.prepare(
    "insert into tasks(id,title,task_type,customer_id,due_at,priority,status,auto_rule,created_at) values(?,?,?,?,?,?,?,?,?)",
  );
  for (let i = 0; i < 20; i++)
    addTask.run(
      crypto.randomUUID(),
      `跟进客户 ${i + 1}`,
      i % 3 === 0 ? "报价跟进" : "客户跟进",
      customerIds[i % 20],
      new Date(Date.now() + (i - 6) * 86400000).toISOString(),
      i < 8 ? "高" : "中",
      "待处理",
      i % 3 === 0 ? "OPPORTUNITY_QUOTED" : null,
      new Date().toISOString(),
    );
  const addOrder = db.prepare(
    "insert into orders(id,order_number,customer_id,status,order_date,sales_amount,sales_currency,revenue_cny,total_cost_cny,net_profit_cny,profit_margin,created_at) values(?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  for (let i = 0; i < 8; i++) {
    const sales = 10000 + i * 2500,
      cost = sales * 0.68,
      profit = sales - cost;
    addOrder.run(
      crypto.randomUUID(),
      `ORD-2026-${String(i + 1).padStart(3, "0")}`,
      customerIds[i],
      i < 3 ? "生产中" : "已完成",
      new Date().toISOString().slice(0, 10),
      sales,
      "CNY",
      sales,
      cost,
      profit,
      (profit / sales) * 100,
      new Date().toISOString(),
    );
  }
}

export function verifyLocalLogin(email: string, password: string) {
  const user = localDb()
    .prepare("select * from users where email=?")
    .get(email) as
    | {
        id: string;
        email: string;
        password_hash: string;
        full_name: string;
        role: string;
      }
    | undefined;
  return user && bcrypt.compareSync(password, user.password_hash) ? user : null;
}
export function localRows(
  table: string,
  where = "deleted_at is null",
  params: unknown[] = [],
) {
  const allowed = new Set([
    "customers",
    "products",
    "suppliers",
    "opportunities",
    "tasks",
    "follow_ups",
    "orders",
    "financial_records",
  ]);
  if (!allowed.has(table)) throw new Error("不允许的本地数据表");
  return localDb()
    .prepare(`select * from ${table} where ${where} order by created_at desc`)
    .all(...params) as Record<string, unknown>[];
}
export function localCreateFinancialRecord(v: Record<string, unknown>) {
  localDb()
    .prepare(
    "insert into financial_records(id,record_type,category,counterparty,amount,currency,amount_cny,occurred_at,status,notes,created_at,order_id,order_revenue_cny,product_cost_cny,freight_cny,miscellaneous_cny,other_cost_cny,total_cost_cny,calculated_profit_cny,profit_margin) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      v.record_type,
      v.category || null,
      v.counterparty || null,
      v.amount,
      v.currency,
      v.amount_cny,
      v.occurred_at,
      v.status || "已完成",
      v.notes || null,
      new Date().toISOString(),
      v.order_id || null,
      v.order_revenue_cny || 0,
      v.product_cost_cny || 0,
      v.freight_cny || 0,
      v.miscellaneous_cny || 0,
      v.other_cost_cny || 0,
      v.total_cost_cny || 0,
      v.calculated_profit_cny || 0,
      v.profit_margin || 0,
    );
}
export function localUpdateFinancialRecord(
  id: string,
  v: Record<string, unknown>,
) {
  localDb()
    .prepare(
      "update financial_records set record_type=?,category=?,counterparty=?,amount=?,currency=?,amount_cny=?,occurred_at=?,status=?,notes=?,order_id=?,order_revenue_cny=?,product_cost_cny=?,freight_cny=?,miscellaneous_cny=?,other_cost_cny=?,total_cost_cny=?,calculated_profit_cny=?,profit_margin=? where id=? and deleted_at is null",
    )
    .run(
      v.record_type,
      v.category || null,
      v.counterparty || null,
      v.amount,
      v.currency,
      v.amount_cny,
      v.occurred_at,
      v.status,
      v.notes || null,
      v.order_id || null,
      v.order_revenue_cny || 0,
      v.product_cost_cny || 0,
      v.freight_cny || 0,
      v.miscellaneous_cny || 0,
      v.other_cost_cny || 0,
      v.total_cost_cny || 0,
      v.calculated_profit_cny || 0,
      v.profit_margin || 0,
      id,
    );
}
export function localCreateCustomer(v: Record<string, unknown>) {
  localDb()
    .prepare(
      "insert into customers(id,customer_code,company_name,country,stage,grade,source,next_follow_up_at,notes,created_at) values(?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      localNextCustomerCode(v.country),
      v.company_name,
      v.country || null,
      v.stage,
      v.grade,
      v.source || null,
      v.next_follow_up_at || null,
      v.notes || null,
      new Date().toISOString(),
    );
}

export function localUpdateCustomerResearch(
  id: string,
  values: {
    background_summary?: string;
    latest_result?: string;
    next_action?: string;
    notes?: string;
  },
) {
  localDb()
    .prepare(
      "update customers set background_summary=?,latest_result=?,next_action=?,notes=? where id=? and deleted_at is null",
    )
    .run(
      values.background_summary || null,
      values.latest_result || null,
      values.next_action || null,
      values.notes || null,
      id,
    );
}
export function localCreateProduct(v: Record<string, unknown>) {
  localDb()
    .prepare(
      "insert into products(id,product_code,product_name,category,material,capacity_value,capacity_unit,neck_size,product_status,purchase_unit_price_cny,purchase_notes,primary_supplier_id,purchase_moq,delivery_lead_time_days,special_notes,created_at,image_path) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      `PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      v.product_name,
      v.category_id || "其他",
      v.material || null,
      v.capacity_value || null,
      v.capacity_unit || "ml",
      v.neck_size || null,
      v.product_status,
      v.purchase_unit_price_cny ?? null,
      v.purchase_notes || null,
      v.primary_supplier_id || null,
      v.purchase_moq ?? null,
      v.delivery_lead_time_days ?? null,
      v.special_notes || null,
      new Date().toISOString(),
      v.image_path || null,
    );
}
export function localSoftDelete(
  table: "customers" | "products" | "tasks",
  id: string,
) {
  localDb()
    .prepare(`update ${table} set deleted_at=? where id=?`)
    .run(new Date().toISOString(), id);
}
export function localSoftDeleteMany(
  table:
    | "tasks"
    | "customers"
    | "suppliers"
    | "opportunities"
    | "orders"
    | "products"
    | "financial_records",
  ids: string[],
) {
  const update = localDb().prepare(
    `update ${table} set deleted_at=? where id=?`,
  );
  const now = new Date().toISOString();
  localDb().transaction((targets: string[]) =>
    targets.forEach((id) => update.run(now, id)),
  )(ids);
}
export function localUpdateEntity(
  table: "suppliers" | "opportunities" | "orders",
  id: string,
  values: Record<string, unknown>,
) {
  const allowed: Record<string, string[]> = {
    suppliers: [
      "company_name",
      "location",
      "supplier_type",
      "standard_moq",
      "lead_time_days",
      "total_score",
      "grade",
      "status",
    ],
    opportunities: [
      "title",
      "customer_id",
      "status",
      "project_progress",
      "estimated_amount",
      "currency",
      "expected_close_date",
    ],
    orders: [
      "order_number",
      "customer_id",
      "order_categories",
      "status",
      "order_date",
      "sales_amount",
      "sales_currency",
      "revenue_cny",
      "total_cost_cny",
      "net_profit_cny",
      "profit_margin",
    ],
  };
  const fields = allowed[table];
  const present = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(values, field),
  );
  if (!present.length) return;
  const db = localDb();
  db
    .prepare(
      `update ${table} set ${present.map((field) => `${field}=?`).join(",")} where id=? and deleted_at is null`,
    )
    .run(...present.map((field) => values[field] || null), id);
  if (table === "suppliers") {
    const supplier = db.prepare("select company_name,location,supplier_code from suppliers where id=?").get(id) as { company_name: string; location: string | null; supplier_code: string } | undefined;
    if (supplier) {
      const sequence = Number(supplier.supplier_code.match(/(\d+)$/)?.[1] || 1);
      db.prepare("update suppliers set supplier_code=? where id=?").run(
        formatSupplierCode(supplierCodePrefix(supplier.location, supplier.company_name), sequence), id,
      );
    }
  }
}
export function localCreateEntity(
  table: "suppliers" | "opportunities" | "orders",
  values: Record<string, unknown>,
) {
  const id = crypto.randomUUID(),
    now = new Date().toISOString(),
    suffix = Date.now().toString().slice(-7);
  if (table === "suppliers")
    localDb()
      .prepare(
        "insert into suppliers(id,supplier_code,company_name,location,supplier_type,standard_moq,lead_time_days,total_score,grade,status,created_at) values(?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        localNextSupplierCode(values.location, values.company_name),
        values.company_name,
        values.location || null,
        values.supplier_type || null,
        values.standard_moq || null,
        values.lead_time_days || null,
        values.total_score || null,
        values.grade || "B",
        values.status || "可合作",
        now,
      );
  if (table === "opportunities")
    localDb()
      .prepare(
        "insert into opportunities(id,opportunity_code,title,customer_id,status,project_progress,estimated_amount,currency,expected_close_date,created_at) values(?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        values.opportunity_code || `OPP-${suffix}`,
        values.title,
        values.customer_id || null,
        values.status || "需求确认中",
        values.project_progress || null,
        values.estimated_amount || null,
        values.currency || "USD",
        values.expected_close_date || null,
        now,
      );
  if (table === "orders")
    localDb()
      .prepare(
        "insert into orders(id,order_number,customer_id,order_categories,status,order_date,sales_amount,sales_currency,revenue_cny,total_cost_cny,net_profit_cny,profit_margin,created_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        values.order_number || `ORD-${suffix}`,
        values.customer_id || null,
        values.order_categories || null,
        values.status || "待确认",
        values.order_date || new Date().toISOString().slice(0, 10),
        values.sales_amount || 0,
        values.sales_currency || "USD",
        values.revenue_cny || 0,
        values.total_cost_cny || 0,
        values.net_profit_cny || 0,
        values.profit_margin || 0,
        now,
      );
  return id;
}
export function localCreateProjectFollowUp(values: {
  customer_id?: unknown;
  opportunity_id: string;
  content: unknown;
  result?: unknown;
}) {
  localDb()
    .prepare(
      "insert into follow_ups(id,customer_id,opportunity_id,channel,content,result,followed_at,created_at) values(?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      values.customer_id || null,
      values.opportunity_id,
      "项目进度",
      String(values.content),
      values.result || null,
      new Date().toISOString(),
      new Date().toISOString(),
    );
}
export function localUpdateCustomer(id: string, v: Record<string, unknown>) {
  localDb()
    .prepare(
      "update customers set company_name=?,country=?,stage=?,grade=?,source=?,next_follow_up_at=?,notes=?,customer_type=?,business_products=?,inquiry_grade=?,email_content=?,contact_name=?,email=?,position=?,social_media=?,phone=?,website=?,latest_result=?,next_action=?,follow_up_reminder=?,follow_up_checkin=?,background_summary=?,company_size=?,last_follow_up_at=?,lark_created_at=? where id=? and deleted_at is null",
    )
    .run(
      v.company_name,
      v.country || null,
      v.stage,
      v.grade,
      v.source || null,
      v.next_follow_up_at || null,
      v.notes || null,
      v.customer_type || null,
      v.business_products || null,
      v.inquiry_grade || null,
      v.email_content || null,
      v.contact_name || null,
      v.email || null,
      v.position || null,
      v.social_media || null,
      v.phone || null,
      v.website || null,
      v.latest_result || null,
      v.next_action || null,
      v.follow_up_reminder || null,
      v.follow_up_checkin || null,
      v.background_summary || null,
      v.company_size || null,
      v.last_follow_up_at || null,
      v.lark_created_at || null,
      id,
    );
}
export function localUpdateProduct(id: string, v: Record<string, unknown>) {
  localDb()
    .prepare(
      "update products set product_name=?,category=?,material=?,capacity_value=?,capacity_unit=?,neck_size=?,product_status=?,purchase_unit_price_cny=?,purchase_notes=?,primary_supplier_id=?,purchase_moq=?,delivery_lead_time_days=?,special_notes=?,image_path=coalesce(?,image_path) where id=? and deleted_at is null",
    )
    .run(
      v.product_name,
      v.category_id || "其他",
      v.material || null,
      v.capacity_value || null,
      v.capacity_unit || "ml",
      v.neck_size || null,
      v.product_status,
      v.purchase_unit_price_cny ?? null,
      v.purchase_notes || null,
      v.primary_supplier_id || null,
      v.purchase_moq ?? null,
      v.delivery_lead_time_days ?? null,
      v.special_notes || null,
      v.image_path || null,
      id,
    );
}
export function localUpdateTask(id: string, v: Record<string, unknown>) {
  localDb()
    .prepare(
      "update tasks set title=?,task_type=?,customer_id=?,opportunity_id=?,due_at=?,priority=?,status=?,auto_rule=? where id=? and deleted_at is null",
    )
    .run(
      v.title,
      v.task_type,
      v.customer_id || null,
      v.opportunity_id || null,
      v.due_at,
      v.priority,
      v.status,
      v.auto_rule || null,
      id,
    );
}
export function localCreateTask(v: Record<string, unknown>) {
  localDb()
    .prepare(
      "insert into tasks(id,title,task_type,customer_id,opportunity_id,due_at,priority,status,auto_rule,created_at) values(?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      crypto.randomUUID(),
      v.title,
      v.task_type,
      v.customer_id || null,
      v.opportunity_id || null,
      v.due_at,
      v.priority,
      v.status,
      v.auto_rule || null,
      new Date().toISOString(),
    );
}

export function localImportCustomers(rows: Record<string, unknown>[]) {
  const db = localDb();
  const find = db.prepare(
    "select id from customers where lower(trim(company_name))=lower(trim(?)) limit 1",
  );
  const insert = db.prepare(
    "insert into customers(id,customer_code,company_name,country,stage,grade,source,next_follow_up_at,notes,created_at,customer_type,business_products,inquiry_grade,email_content,contact_name,email,position,social_media,phone,latest_result,next_action,follow_up_reminder,follow_up_checkin,background_summary,company_size,website,last_follow_up_at,lark_created_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const update = db.prepare(
    "update customers set deleted_at=null,country=coalesce(?,country),stage=coalesce(?,stage),grade=coalesce(?,grade),source=coalesce(?,source),next_follow_up_at=coalesce(?,next_follow_up_at),notes=coalesce(?,notes),customer_type=coalesce(?,customer_type),business_products=coalesce(?,business_products),inquiry_grade=coalesce(?,inquiry_grade),email_content=coalesce(?,email_content),contact_name=coalesce(?,contact_name),email=coalesce(?,email),position=coalesce(?,position),social_media=coalesce(?,social_media),phone=coalesce(?,phone),latest_result=coalesce(?,latest_result),next_action=coalesce(?,next_action),follow_up_reminder=coalesce(?,follow_up_reminder),follow_up_checkin=coalesce(?,follow_up_checkin),background_summary=coalesce(?,background_summary),company_size=coalesce(?,company_size),website=coalesce(?,website),last_follow_up_at=coalesce(?,last_follow_up_at),lark_created_at=coalesce(?,lark_created_at) where id=?",
  );
  let created = 0,
    updated = 0,
    skipped = 0;
  db.transaction((items: Record<string, unknown>[]) => {
    for (const row of items) {
      const company = String(row.company_name ?? "").trim();
      if (!company) {
        skipped++;
        continue;
      }
      const values = [
        row.country || null,
        row.stage || "待开发",
        row.grade || "C",
        row.source || null,
        row.next_follow_up_at || null,
        row.notes || null,
        row.customer_type || null,
        row.business_products || null,
        row.inquiry_grade || null,
        row.email_content || null,
        row.contact_name || null,
        row.email || null,
        row.position || null,
        row.social_media || null,
        row.phone || null,
        row.latest_result || null,
        row.next_action || null,
        row.follow_up_reminder || null,
        row.follow_up_checkin || null,
        row.background_summary || null,
        row.company_size || null,
        row.website || null,
        row.last_follow_up_at || null,
        row.lark_created_at || null,
      ];
      const old = find.get(company) as { id: string } | undefined;
      if (old) {
        update.run(...values, old.id);
        updated++;
      } else {
        insert.run(
          crypto.randomUUID(),
          localNextCustomerCode(row.country),
          company,
          ...values.slice(0, 6),
          new Date().toISOString(),
          ...values.slice(6),
        );
        created++;
      }
    }
  })(rows);
  return { created, updated, skipped, total: rows.length };
}

export function localImportSuppliers(rows: Record<string, unknown>[]) {
  const db = localDb();
  const find = db.prepare("select id from suppliers where lower(trim(company_name))=lower(trim(?)) limit 1");
  const insert = db.prepare("insert into suppliers(id,supplier_code,company_name,location,supplier_type,standard_moq,lead_time_days,total_score,grade,status,created_at) values(?,?,?,?,?,?,?,?,?,?,?)");
  const update = db.prepare("update suppliers set deleted_at=null,location=coalesce(?,location),supplier_type=coalesce(?,supplier_type),standard_moq=coalesce(?,standard_moq),lead_time_days=coalesce(?,lead_time_days),total_score=coalesce(?,total_score),grade=coalesce(?,grade),status=coalesce(?,status) where id=?");
  let created = 0, updated = 0, skipped = 0;
  db.transaction((items: Record<string, unknown>[]) => {
    for (const row of items) {
      const company = String(row.company_name ?? "").trim();
      if (!company) { skipped++; continue; }
      const old = find.get(company) as { id: string } | undefined;
      if (old) {
        update.run(row.location || null, row.supplier_type || null, row.standard_moq || null, row.lead_time_days || null, row.total_score || null, row.grade || null, row.status || null, old.id);
        updated++;
      } else {
        insert.run(crypto.randomUUID(), localNextSupplierCode(row.location, company), company, row.location || null, row.supplier_type || null, row.standard_moq || null, row.lead_time_days || null, row.total_score || null, row.grade || "B", row.status || "可合作", new Date().toISOString());
        created++;
      }
    }
  })(rows);
  migrateSupplierCodes(db);
  return { total: rows.length, created, updated, skipped };
}
