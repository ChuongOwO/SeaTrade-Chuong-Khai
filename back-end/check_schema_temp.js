const pool = require('./src/config/database');
pool.query("SELECT unnest(enum_range(NULL::vessel_type))::text AS val").then(r=>{
  console.log('vessel_type values:', r.rows.map(x=>x.val));
  pool.end();
}).catch(e=>{ console.error(e.message); pool.end(); });
