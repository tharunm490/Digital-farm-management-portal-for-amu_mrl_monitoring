const fs = require('fs');

const data = JSON.parse(fs.readFileSync('data/dosage_reference_full_extended_with_mrl.json', 'utf8'));

const result = {};

for (const category in data.categories) {
  result[category] = {};
  for (const medicine in data.categories[category].medicines) {
    for (const species in data.categories[category].medicines[medicine].species) {
      if (!result[category][species]) result[category][species] = [];
      result[category][species].push({
        medicine: medicine,
        route: data.categories[category].medicines[medicine].species[species].recommended_route
      });
    }
  }
}

console.log(JSON.stringify(result, null, 2));