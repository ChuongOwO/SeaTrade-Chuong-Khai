#!/usr/bin/env node
// Wrapper Flyway CLI tự viết (KHÔNG dùng gói `node-flywaydb` nữa). Lý do đổi:
//
// 1) `node-flywaydb` đã ngừng bảo trì, tải file dạng cũ
//    "flyway-commandline-<version>-windows-x64.zip". Từ Flyway 11 trở đi,
//    Redgate đổi cách đóng gói và không còn xuất bản file .zip kèm sẵn Java
//    cho từng hệ điều hành lên Maven Central nữa (chỉ còn 1 file .jar thuần)
//    -> tải bản 11/12/13.x bị lỗi 404. Wrapper này cố định dùng bản 10.22.0
//    (bản 10.x cuối cùng còn đủ file .zip/.tar.gz kèm JRE cho Windows/macOS/
//    Linux), tự tải nếu chưa có.
// 2) Cách `node-flywaydb` tự chạy (spawn) file flyway.cmd trên Windows THIẾU
//    tùy chọn { shell: true }, gây lỗi "spawn EINVAL" trên Node bản mới
//    (Node 18 trở lên chạy .cmd/.bat trên Windows bắt buộc phải có
//    shell: true). Wrapper này tự spawn với shell: true nên tránh được lỗi đó.
//
// Dùng: node scripts/flyway.js <migrate|info|validate|baseline>
// (đã có sẵn trong package.json qua các script db:migrate, db:info, ...)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
require('dotenv').config();

const FLYWAY_VERSION = '10.22.0';
const ROOT = path.join(__dirname, '..'); // thư mục back-end/
const CLI_DIR = path.join(ROOT, '.flyway-cli');
const VERSION_DIR = path.join(CLI_DIR, `flyway-${FLYWAY_VERSION}`);

function platformAsset() {
  const plat = os.platform();
  if (plat === 'win32') {
    return { file: `flyway-commandline-${FLYWAY_VERSION}-windows-x64.zip`, bin: 'flyway.cmd', archive: 'zip' };
  }
  if (plat === 'darwin') {
    return { file: `flyway-commandline-${FLYWAY_VERSION}-macosx-x64.tar.gz`, bin: 'flyway', archive: 'tar' };
  }
  return { file: `flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz`, bin: 'flyway', archive: 'tar' };
}

async function ensureFlyway() {
  const { file, bin, archive } = platformAsset();
  const binPath = path.join(VERSION_DIR, bin);
  if (fs.existsSync(binPath)) return binPath;

  console.log(`[flyway] Chưa có Flyway CLI cục bộ, đang tải ${file} ...`);
  fs.mkdirSync(CLI_DIR, { recursive: true });
  const url = `https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/${FLYWAY_VERSION}/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Tải Flyway CLI thất bại (HTTP ${res.status}): ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());

  if (archive === 'zip') {
    const AdmZipCtor = AdmZip;
    const tmpZipPath = path.join(CLI_DIR, file);
    fs.writeFileSync(tmpZipPath, buf);
    const zip = new AdmZipCtor(tmpZipPath);
    zip.extractAllTo(CLI_DIR, true);
    fs.unlinkSync(tmpZipPath);
  } else {
    throw new Error(
      `Wrapper này mới tự giải nén .zip (Windows). Trên macOS/Linux hãy tự tải và giải nén\n` +
      `${url}\nvào thư mục: ${CLI_DIR}`
    );
  }

  if (!fs.existsSync(binPath)) {
    throw new Error(`Không tìm thấy "${binPath}" sau khi giải nén — cấu trúc file zip có thể đã đổi.`);
  }
  console.log(`[flyway] Đã sẵn sàng: ${binPath}`);
  return binPath;
}

function parseDatabaseUrl(raw) {
  if (!raw) {
    throw new Error(
      'Thiếu DATABASE_URL trong back-end/.env.\n' +
      'Xem back-end/.env.example — ví dụ:\n' +
      '  DATABASE_URL=postgres://postgres:MAT_KHAU_CUA_BAN@localhost:5432/seafood_trading'
    );
  }
  let u;
  try {
    u = new URL(raw);
  } catch (err) {
    throw new Error(`DATABASE_URL không hợp lệ: ${raw}\n${err.message}`);
  }
  return {
    jdbcUrl: `jdbc:postgresql://${u.hostname}:${u.port || 5432}${u.pathname}`,
    user: decodeURIComponent(u.username || 'postgres'),
    password: decodeURIComponent(u.password || ''),
  };
}

async function main() {
  const flywayCommand = process.argv[2] || 'migrate'; // migrate | info | validate | baseline
  const binPath = await ensureFlyway();
  const { jdbcUrl, user, password } = parseDatabaseUrl(process.env.DATABASE_URL);

  const args = [
    `-url=${jdbcUrl}`,
    `-user=${user}`,
    `-password=${password}`,
    '-schemas=public',
    '-locations=filesystem:migrations',
    // Phòng trường hợp DB đã có sẵn bảng do ai đó lỡ chạy tay
    // full_schema_dongdoi.sql trước đây.
    '-baselineOnMigrate=true',
    flywayCommand,
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(binPath, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true, // bắt buộc trên Windows để spawn được file .cmd
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Flyway CLI thoát với mã lỗi ${code}`));
    });
  });
}

main().catch((err) => {
  console.error('[flyway]', err.message);
  process.exit(1);
});
