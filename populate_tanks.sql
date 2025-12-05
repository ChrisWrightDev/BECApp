
-- SQL Query to Populate Tanks Table
-- Generates all tank numbers in format: [A-F][1-4][1-12]
-- Examples: A11, A12, ..., A112, A21, ..., F412
-- Total: 6 letters × 4 numbers × 12 numbers = 288 tanks

INSERT INTO tanks (name, description, status, created_at, updated_at)
SELECT 
  letter || first_num || last_num AS name,
  'Tank ' || letter || first_num || last_num AS description,
  'active' AS status,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  SELECT chr(65 + s) AS letter
  FROM generate_series(0, 5) AS s  -- A to F (65-70 in ASCII)
) letters
CROSS JOIN (
  SELECT generate_series(1, 4)::text AS first_num  -- 1 to 4
) first_numbers
CROSS JOIN (
  SELECT generate_series(1, 12)::text AS last_num  -- 1 to 12
) last_numbers
ORDER BY letter, first_num::integer, last_num::integer;

-- Verify the count (should be 288)
-- SELECT COUNT(*) FROM tanks WHERE name ~ '^[A-F][1-4][0-9]+$';

-- View a sample of the generated tanks
-- SELECT name FROM tanks ORDER BY name LIMIT 20;


