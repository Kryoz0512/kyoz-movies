<?php
// Saves reviews to php/reviews.json. Run from the cinema-home folder: php -S localhost:8000
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(json_encode(['ok'=>false])); }

$category = trim($_POST['category'] ?? '');
$title    = trim($_POST['title'] ?? '');
$feedback = trim($_POST['feedback'] ?? '');
$rating   = (int)($_POST['rating'] ?? 0);

if (!$title || !$feedback || $rating < 1 || $rating > 5) {
  http_response_code(422); exit(json_encode(['ok'=>false,'error'=>'Invalid input']));
}

$file = __DIR__ . '/reviews.json';
$all = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
$all[] = [
  'category' => htmlspecialchars($category), 'title' => htmlspecialchars($title),
  'feedback' => htmlspecialchars($feedback), 'rating' => $rating, 'date' => date('c'),
];
file_put_contents($file, json_encode($all, JSON_PRETTY_PRINT), LOCK_EX);
echo json_encode(['ok'=>true]);
