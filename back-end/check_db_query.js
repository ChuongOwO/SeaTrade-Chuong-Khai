const pool = require('./src/config/database');
const query = `
    SELECT
      v.id            AS vessel_id,
      v.vessel_name,
      v.vessel_type,
      v.status,
      ST_X(vl.location::geometry) AS longitude,
      ST_Y(vl.location::geometry) AS latitude,
      vl.speed,
      vl.heading,
      vl.recorded_at
    FROM vessels v
    INNER JOIN (
      SELECT DISTINCT ON (vessel_id)
        vessel_id,
        location,
        speed,
        heading,
        recorded_at
      FROM vessel_locations
      ORDER BY vessel_id, recorded_at DESC
    ) vl ON v.id = vl.vessel_id
    WHERE v.status = 'ACTIVE'
    ORDER BY vl.recorded_at DESC
`;
pool.query(query).then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); }).catch(e => { console.error(e); pool.end(); });
