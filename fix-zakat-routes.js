const fs = require('fs');
const path = require('path');

const files = [
  'apps/api/src/routes/admin/zakat-donations.ts',
  'apps/api/src/routes/admin/zakat-distributions.ts',
  'apps/api/src/routes/admin/zakat-stats.ts'
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Replace imports
  content = content.replace(
    /import \{ db,([^}]+)\} from "@bantuanku\/db";/g,
    'import {$1} from "@bantuanku/db";'
  );

  // Add Env and Variables import if not present
  if (!content.includes('import type { Env, Variables }')) {
    content = content.replace(
      /from "@bantuanku\/db";/,
      'from "@bantuanku/db";\nimport type { Env, Variables } from "../../types";'
    );
  }

  // Replace Hono instantiation
  content = content.replace(
    /const app = new Hono\(\);/g,
    'const app = new Hono<{ Bindings: Env; Variables: Variables }>();'
  );

  // Add const db = c.get("db"); at the start of each route handler
  // Match various route patterns
  const routePatterns = [
    /app\.(get|post|put|delete)\(["'][^"']+["'],\s*async \(c\) => \{/g,
    /app\.(get|post|put|delete)\(["'][^"']+["'],\s*requireAuth,\s*async \(c\) => \{/g,
    /app\.(get|post|put|delete)\(["'][^"']+["'],\s*requireRoles\([^)]+\),\s*async \(c\) => \{/g,
  ];

  routePatterns.forEach(pattern => {
    content = content.replace(pattern, (match) => {
      // Check if already has const db
      const nextLines = content.substring(content.indexOf(match) + match.length, content.indexOf(match) + match.length + 100);
      if (nextLines.trim().startsWith('const db = c.get("db")')) {
        return match;
      }
      return match + '\n  const db = c.get("db");';
    });
  });

  fs.writeFileSync(filePath, content);
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\nAll files processed!');
