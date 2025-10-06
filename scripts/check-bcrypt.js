const bcrypt = require('bcryptjs');
const hash = '$2b$12$ThhqFwzndya5ghfWzOxnquYHhFxlaqBjCu1vpsSfmhrbYtpD0/.E2';
(async () => {
  console.log('length', hash.length);
  console.log('match', await bcrypt.compare('admin123', hash));
})();
