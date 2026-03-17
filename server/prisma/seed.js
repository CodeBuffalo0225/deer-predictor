import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Clean existing data
  await prisma.vectorEntry.deleteMany()
  await prisma.weeklyBriefing.deleteMany()
  await prisma.predictionReport.deleteMany()
  await prisma.standIntrusionLog.deleteMany()
  await prisma.signObservation.deleteMany()
  await prisma.sighting.deleteMany()
  await prisma.doeGroup.deleteMany()
  await prisma.trailCamPhoto.deleteMany()
  await prisma.deerSeasonSnapshot.deleteMany()
  await prisma.deer.deleteMany()
  await prisma.propertyMarker.deleteMany()
  await prisma.season.deleteMany()
  await prisma.property.deleteMany()

  // === PROPERTY ===
  const property = await prisma.property.create({
    data: {
      id: 'hollow-creek-farm',
      name: 'Hollow Creek Farm',
      acreage: 340,
      state: 'Ohio',
      county: 'Pike County',
      lat: 39.03,
      lng: -82.60,
      sanctuaryZones: JSON.stringify([
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-82.605, 39.035], [-82.600, 39.035], [-82.600, 39.032], [-82.605, 39.032], [-82.605, 39.035]]] } }
      ]),
      windPatternsByMonth: JSON.stringify({
        '9': ['SW', 'W'], '10': ['NW', 'W', 'SW'], '11': ['NW', 'N', 'W'], '12': ['NW', 'N']
      }),
    },
  })

  // === SEASONS ===
  const s2022 = await prisma.season.create({
    data: {
      propertyId: property.id, year: 2022, label: '2022 Archery + Gun',
      archeryOpen: new Date('2022-09-24'), archeryClose: new Date('2023-02-05'),
      gunOpen: new Date('2022-11-28'), gunClose: new Date('2022-12-11'),
      mastCropRating: 'good',
      foodSourceLog: JSON.stringify({ '10': { whiteOak: 'good', redOak: 'fair', corn: 'standing', foodPlot: 'active' }, '11': { whiteOak: 'poor', redOak: 'good', corn: 'picked', foodPlot: 'active' } }),
      neighborPressureEvents: JSON.stringify([
        { date: '2022-11-28', description: 'South neighbor gun season opener, 6 hunters', impact: 'high' },
        { date: '2022-12-03', description: 'East neighbor afternoon drive', impact: 'moderate' },
      ]),
    },
  })
  const s2023 = await prisma.season.create({
    data: {
      propertyId: property.id, year: 2023, label: '2023 Archery + Gun',
      archeryOpen: new Date('2023-09-23'), archeryClose: new Date('2024-02-04'),
      gunOpen: new Date('2023-11-27'), gunClose: new Date('2023-12-10'),
      mastCropRating: 'exceptional',
      foodSourceLog: JSON.stringify({ '10': { whiteOak: 'exceptional', redOak: 'good', corn: 'standing', foodPlot: 'active' }, '11': { whiteOak: 'good', redOak: 'good', corn: 'picked', foodPlot: 'browsed' } }),
      neighborPressureEvents: JSON.stringify([
        { date: '2023-11-27', description: 'South neighbor gun opener, 4 hunters', impact: 'moderate' },
      ]),
    },
  })
  const s2024 = await prisma.season.create({
    data: {
      propertyId: property.id, year: 2024, label: '2024 Archery + Gun',
      archeryOpen: new Date('2024-09-28'), archeryClose: new Date('2025-02-02'),
      gunOpen: new Date('2024-12-02'), gunClose: new Date('2024-12-15'),
      mastCropRating: 'poor',
      foodSourceLog: JSON.stringify({ '10': { whiteOak: 'none', redOak: 'poor', corn: 'standing', foodPlot: 'critical' }, '11': { whiteOak: 'none', redOak: 'poor', corn: 'picked', foodPlot: 'critical' } }),
      neighborPressureEvents: JSON.stringify([
        { date: '2024-12-02', description: 'South + East neighbors both opening day, 8+ hunters combined', impact: 'high' },
      ]),
      notes: 'Poor mast crop year — food plots became primary food source. Great year for stand hunting over food.',
    },
  })

  // === MARKERS ===
  const markers = await Promise.all([
    prisma.propertyMarker.create({ data: { id: 'cam_east_ridge', propertyId: property.id, type: 'TRAIL_CAM', label: 'East Ridge Cam', lat: 39.032, lng: -82.598, notes: 'Overlooking scrape cluster and saddle' } }),
    prisma.propertyMarker.create({ data: { id: 'cam_south_field', propertyId: property.id, type: 'TRAIL_CAM', label: 'South Field Cam', lat: 39.028, lng: -82.602, notes: 'Food plot edge, SE corner' } }),
    prisma.propertyMarker.create({ data: { id: 'cam_creek_crossing', propertyId: property.id, type: 'TRAIL_CAM', label: 'Creek Crossing Cam', lat: 39.030, lng: -82.604, notes: 'Major travel corridor' } }),
    prisma.propertyMarker.create({ data: { id: 'cam_north_sanctuary', propertyId: property.id, type: 'TRAIL_CAM', label: 'North Sanctuary Cam', lat: 39.035, lng: -82.601, notes: 'Edge of sanctuary, nocturnal hits mostly' } }),
    prisma.propertyMarker.create({ data: { id: 'stand_east_ridge', propertyId: property.id, type: 'STAND', label: 'East Ridge Stand', lat: 39.0315, lng: -82.597, notes: 'Saddle stand, best rut spot', windViableDirections: JSON.stringify(['NW', 'W', 'WNW']), thermalBehavior: JSON.stringify({ morning: 'downhill_to_creek', evening: 'uphill_ridge' }), restDaysRecommended: 7, entryRoutes: JSON.stringify(['entry_creek_bottom']), exitRoutes: JSON.stringify(['exit_field_edge']) } }),
    prisma.propertyMarker.create({ data: { id: 'stand_south_field', propertyId: property.id, type: 'STAND', label: 'South Field Stand', lat: 39.027, lng: -82.603, notes: 'Food plot stand, great for afternoons', windViableDirections: JSON.stringify(['N', 'NW', 'NE']), restDaysRecommended: 5 } }),
    prisma.propertyMarker.create({ data: { id: 'stand_creek_funnel', propertyId: property.id, type: 'STAND', label: 'Creek Funnel Stand', lat: 39.029, lng: -82.605, notes: 'Pinch point between creek and ridge', windViableDirections: JSON.stringify(['S', 'SE', 'SW']), restDaysRecommended: 10 } }),
    prisma.propertyMarker.create({ data: { id: 'scrape_cluster_east', propertyId: property.id, type: 'SCRAPE', label: 'East Ridge Scrape Cluster', lat: 39.0318, lng: -82.5975, notes: 'Community scrape area, active Oct 10-Nov 15 every year' } }),
    prisma.propertyMarker.create({ data: { id: 'food_plot_south', propertyId: property.id, type: 'FOOD_PLOT', label: 'South Food Plot', lat: 39.0275, lng: -82.6025, notes: '2-acre clover/brassica mix' } }),
    prisma.propertyMarker.create({ data: { id: 'bedding_north', propertyId: property.id, type: 'BED', label: 'North Bedding Area', lat: 39.034, lng: -82.600, notes: 'Thick cover, primary buck bedding' } }),
    prisma.propertyMarker.create({ data: { id: 'pinch_point_west', propertyId: property.id, type: 'PINCH_POINT', label: 'West Pinch Point', lat: 39.031, lng: -82.607, notes: 'Between creek and fence, natural funnel' } }),
    prisma.propertyMarker.create({ data: { id: 'entry_creek_bottom', propertyId: property.id, type: 'ENTRY_ROUTE', label: 'Creek Bottom Entry', lat: 39.029, lng: -82.600, notes: 'Low-impact entry route to East Ridge' } }),
    prisma.propertyMarker.create({ data: { id: 'exit_field_edge', propertyId: property.id, type: 'EXIT_ROUTE', label: 'Field Edge Exit', lat: 39.033, lng: -82.596, notes: 'Exit after dark along field edge' } }),
    prisma.propertyMarker.create({ data: { id: 'water_creek', propertyId: property.id, type: 'WATER_SOURCE', label: 'Hollow Creek', lat: 39.030, lng: -82.605, notes: 'Year-round water source' } }),
  ])

  // === DEER ===
  const mainFrame = await prisma.deer.create({
    data: {
      id: 'main-frame-10', propertyId: property.id, name: 'Main Frame 10', nickname: 'Main Frame',
      species: 'whitetail', sex: 'buck', estimatedAgeAtFirstSighting: 3.5, currentEstimatedAge: 5.5,
      antlerPoints: 10, antlerDescription: 'Clean typical 10-point frame with split brow tine left side, tall G2s, good mass',
      distinguishingFeatures: 'Split left brow tine, slightly darker coat, wide body',
      status: 'alive', isNocturnal: false,
      notes: 'Most consistent daylight buck on the property. First identified in 2022 as a 3.5yr old.',
    },
  })

  const crabClaw = await prisma.deer.create({
    data: {
      id: 'crab-claw', propertyId: property.id, name: 'Crab Claw', nickname: 'Crab',
      species: 'whitetail', sex: 'buck', estimatedAgeAtFirstSighting: 2.5, currentEstimatedAge: 4.5,
      antlerPoints: 8, antlerDescription: '8-point with distinctive crab claw kicker off right G2, heavy beams',
      distinguishingFeatures: 'Crab claw kicker on right G2, dark tarsal staining in rut',
      status: 'alive', isNocturnal: true,
      notes: 'Primarily nocturnal. One daylight chasing-phase hit per season. Worth waiting for.',
    },
  })

  const ghost = await prisma.deer.create({
    data: {
      id: 'ghost', propertyId: property.id, name: 'Ghost', nickname: 'Ghost',
      species: 'whitetail', sex: 'buck', estimatedAgeAtFirstSighting: 4.5, currentEstimatedAge: 6.5,
      antlerPoints: 12, antlerDescription: 'Wide 12-point, non-typical extras, estimated 175" gross, massive body',
      distinguishingFeatures: 'Drop tine right side, extremely wide spread 22"+, heavy body',
      status: 'alive', isNocturnal: true,
      notes: 'True ghost buck. Zero in-person sightings. Only nocturnal cam hits between 11PM-3AM. Classic sanctuary buck.',
    },
  })

  const oldGirl = await prisma.deer.create({
    data: {
      id: 'old-girl', propertyId: property.id, name: 'Old Girl', nickname: 'Mama',
      species: 'whitetail', sex: 'doe', estimatedAgeAtFirstSighting: 4.0, currentEstimatedAge: 7.0,
      distinguishingFeatures: 'Notched right ear, large body, always leads the group',
      status: 'alive', isNocturnal: false,
      notes: 'Matriarch of South Field Group. 6 fawns raised over 3 seasons. Key for rut prediction.',
    },
  })

  // === DEER SEASON SNAPSHOTS ===
  await prisma.deerSeasonSnapshot.createMany({
    data: [
      // Main Frame 10
      { deerId: mainFrame.id, season: 2022, estimatedAge: 3.5, antlerPoints: 10, antlerDescription: '10-point typical, 138" gross estimate, good frame but young mass', estimatedScore: 138, bodyConditionRating: 'good', peakWeightEstimate: '190 lbs', totalSightings: 8, totalCamHits: 24, daylightHitPercent: 62, homeRangeDescription: 'East ridge to south food plot corridor', aiAnnualSummary: 'First year of identification. 3.5yr showing great frame. Consistently using east ridge saddle and south food plot. Good daylight activity.' },
      { deerId: mainFrame.id, season: 2023, estimatedAge: 4.5, antlerPoints: 10, antlerDescription: '10-point typical, 151" gross, significant mass gain, taller G2s', estimatedScore: 151, bodyConditionRating: 'excellent', peakWeightEstimate: '210 lbs', totalSightings: 11, totalCamHits: 31, daylightHitPercent: 58, homeRangeDescription: 'Expanded range to include creek crossing and west pinch', aiAnnualSummary: 'Major jump in score and body mass. Exceptional mast crop year. Expanded home range. Still a reliable daylight mover.', growthDeltaNotes: '+13" gross score. Beam mass notably heavier. Body filled out significantly.' },
      { deerId: mainFrame.id, season: 2024, estimatedAge: 5.5, antlerPoints: 10, antlerDescription: '10-point typical, 160" gross, peak frame, exceptional mass and tine length', estimatedScore: 160, bodyConditionRating: 'excellent', peakWeightEstimate: '220 lbs', totalSightings: 9, totalCamHits: 28, daylightHitPercent: 55, homeRangeDescription: 'Core area shifted slightly south toward food plots due to poor mast', aiAnnualSummary: 'Likely at or near peak. Poor mast year pushed him toward food plots. Daylight % slightly down but still huntable. Trophy-class deer.', growthDeltaNotes: '+9" gross. Reached 160" class. Tine length maxed. Mass still increasing.' },
      // Crab Claw
      { deerId: crabClaw.id, season: 2022, estimatedAge: 2.5, antlerPoints: 8, antlerDescription: 'Young 8-point, 115" class, first sign of kicker developing', estimatedScore: 115, bodyConditionRating: 'good', peakWeightEstimate: '170 lbs', totalSightings: 3, totalCamHits: 15, daylightHitPercent: 20, homeRangeDescription: 'North sanctuary edge primarily' },
      { deerId: crabClaw.id, season: 2023, estimatedAge: 3.5, antlerPoints: 8, antlerDescription: '8-point, 132" class, crab claw kicker fully formed', estimatedScore: 132, bodyConditionRating: 'good', peakWeightEstimate: '190 lbs', totalSightings: 4, totalCamHits: 19, daylightHitPercent: 15, homeRangeDescription: 'North sanctuary to east ridge, mainly nocturnal' },
      { deerId: crabClaw.id, season: 2024, estimatedAge: 4.5, antlerPoints: 8, antlerDescription: '8-point, 145" class, heavy beams, pronounced kicker', estimatedScore: 145, bodyConditionRating: 'excellent', peakWeightEstimate: '205 lbs', totalSightings: 5, totalCamHits: 22, daylightHitPercent: 18, homeRangeDescription: 'Same pattern, one daylight chasing hit' },
      // Ghost
      { deerId: ghost.id, season: 2022, estimatedAge: 4.5, antlerPoints: 12, antlerDescription: 'Wide non-typical 12, 160" class, drop tine developing', estimatedScore: 160, bodyConditionRating: 'excellent', peakWeightEstimate: '230 lbs', totalSightings: 0, totalCamHits: 8, daylightHitPercent: 0, homeRangeDescription: 'North sanctuary only — never photographed south of creek' },
      { deerId: ghost.id, season: 2023, estimatedAge: 5.5, antlerPoints: 12, antlerDescription: 'Massive 12-point, 170" class, full drop tine, heavy mass', estimatedScore: 170, bodyConditionRating: 'excellent', peakWeightEstimate: '240 lbs', totalSightings: 0, totalCamHits: 11, daylightHitPercent: 0, homeRangeDescription: 'North sanctuary, one creek crossing hit at 1:30AM' },
      { deerId: ghost.id, season: 2024, estimatedAge: 6.5, antlerPoints: 12, antlerDescription: 'Monster 12-point, estimated 175"+ gross, wide spread 22"+, may be declining', estimatedScore: 175, bodyConditionRating: 'good', peakWeightEstimate: '235 lbs', totalSightings: 0, totalCamHits: 9, daylightHitPercent: 0, homeRangeDescription: 'Same sanctuary pattern. Body condition slightly down — may be past peak.' },
    ],
  })

  // === DOE GROUPS ===
  await prisma.doeGroup.create({
    data: {
      id: 'south-field-group', propertyId: property.id, name: 'South Field Group',
      matriarchDeerIds: JSON.stringify([oldGirl.id]),
      estimatedSize: 6,
      primaryFeedingMarkerId: 'food_plot_south',
      primaryBeddingMarkerId: 'bedding_north',
      homeRangeDescription: 'South food plot to east ridge timber edge. Bed in thick cover north of creek.',
      notes: 'Old Girl leads this group. 2 adult does, 2-3 fawns each year. Key for rut-phase buck prediction.',
    },
  })

  await prisma.doeGroup.create({
    data: {
      id: 'creek-bottom-group', propertyId: property.id, name: 'Creek Bottom Group',
      estimatedSize: 4,
      primaryFeedingMarkerId: 'water_creek',
      homeRangeDescription: 'Along Hollow Creek from west pinch to east property line. Browse feeders.',
      notes: 'Smaller group, less predictable. Bucks check this group during peak rut.',
    },
  })

  // === SIGHTINGS (60 total across 3 seasons) ===
  const sightingData = [
    // 2022 Season (20 sightings)
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-10-01T06:30:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'S', windDirection: 'NW', temperature: 48, barometricPressure: 30.12, pressureTrend: 'steady', moonPhase: 'waxing_crescent', timeOfDay: 'dawn', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-10-08T17:15:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'W', windDirection: 'SW', temperature: 55, barometricPressure: 29.85, pressureTrend: 'falling', moonPhase: 'full_moon', timeOfDay: 'afternoon', rutPhase: 'pre_rut', vegetationState: 'peak_color', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2022-10-15T06:45:00'), locationMarkerId: 'stand_east_ridge', behavior: 'scraping', travelDirection: 'SE', windDirection: 'NW', temperature: 42, barometricPressure: 30.25, pressureTrend: 'rising', moonPhase: 'waning_gibbous', timeOfDay: 'dawn', rutPhase: 'pre_rut', vegetationState: 'peak_color', huntingPressure: 'low', notes: 'Working scrape cluster hard. 25 yards. Let him walk.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2022-10-12T01:30:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', travelDirection: 'W', temperature: 50, barometricPressure: 29.90, pressureTrend: 'falling', moonPhase: 'waning_gibbous', timeOfDay: 'night', rutPhase: 'pre_rut', vegetationState: 'peak_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2022-10-20T23:45:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', travelDirection: 'E', temperature: 45, barometricPressure: 30.05, pressureTrend: 'steady', moonPhase: 'waning_crescent', timeOfDay: 'night', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'none', notes: 'Ghost first appearance this season. 11:45PM.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2022-10-28T17:00:00'), locationMarkerId: 'stand_south_field', behavior: 'chasing', travelDirection: 'N', windDirection: 'NW', temperature: 38, barometricPressure: 29.70, pressureTrend: 'falling', moonPhase: 'waxing_crescent', timeOfDay: 'afternoon', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'low', notes: 'Chasing doe through south field. First chasing sighting of the year.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-11-02T07:15:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'N', windDirection: 'W', temperature: 35, barometricPressure: 30.35, pressureTrend: 'rising', moonPhase: 'first_quarter', timeOfDay: 'morning', rutPhase: 'chasing', vegetationState: 'post_drop', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([]), type: 'in_person', observedAt: new Date('2022-11-05T16:30:00'), locationMarkerId: 'stand_east_ridge', behavior: 'feeding', travelDirection: 'unknown', windDirection: 'NW', temperature: 40, barometricPressure: 30.10, pressureTrend: 'steady', moonPhase: 'waxing_gibbous', timeOfDay: 'afternoon', rutPhase: 'chasing', vegetationState: 'post_drop', huntingPressure: 'moderate', doeGroupId: 'south-field-group', notes: 'South field group doe feeding below stand. No bucks yet.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2022-11-08T07:30:00'), locationMarkerId: 'stand_east_ridge', behavior: 'tending', travelDirection: 'S', windDirection: 'NW', temperature: 32, barometricPressure: 29.65, pressureTrend: 'falling', moonPhase: 'full_moon', timeOfDay: 'morning', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'moderate', doeGroupId: 'south-field-group', notes: 'LOCKED DOWN with doe from South Field Group. 40 yards. No shot through brush. Best rut sighting of 2022.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2022-11-10T14:20:00'), locationMarkerId: 'cam_east_ridge', behavior: 'chasing', travelDirection: 'W', temperature: 36, barometricPressure: 29.55, pressureTrend: 'falling', moonPhase: 'full_moon', timeOfDay: 'afternoon', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'moderate', notes: 'Crab Claw DAYLIGHT hit during peak rut! Only daylight cam photo this season.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2022-11-12T02:00:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'scraping', travelDirection: 'S', temperature: 30, barometricPressure: 30.20, pressureTrend: 'rising', moonPhase: 'waning_gibbous', timeOfDay: 'night', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-11-15T16:45:00'), locationMarkerId: 'cam_south_field', behavior: 'traveling', travelDirection: 'E', windDirection: 'W', temperature: 42, barometricPressure: 30.00, pressureTrend: 'steady', moonPhase: 'waning_gibbous', timeOfDay: 'afternoon', rutPhase: 'lockdown', vegetationState: 'bare', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, type: 'sign_only', observedAt: new Date('2022-10-14T10:00:00'), locationMarkerId: 'scrape_cluster_east', behavior: 'scraping', season: 2022, windDirection: 'NW', temperature: 45, rutPhase: 'pre_rut', vegetationState: 'peak_color', notes: 'Scrape cluster activated. 4 scrapes within 50 yards all freshened.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-11-20T06:15:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'N', temperature: 28, barometricPressure: 30.40, pressureTrend: 'rising', timeOfDay: 'dawn', rutPhase: 'post_rut', vegetationState: 'bare', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2022-11-18T01:15:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', travelDirection: 'W', temperature: 25, barometricPressure: 30.45, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'post_rut', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-12-01T07:00:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'SW', temperature: 22, barometricPressure: 30.30, pressureTrend: 'steady', timeOfDay: 'morning', rutPhase: 'recovery', vegetationState: 'bare', huntingPressure: 'high', notes: 'Gun season opener. Still on food.' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2022-12-05T00:30:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'bedded', temperature: 18, barometricPressure: 30.50, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'high' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2022-12-08T22:00:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'N', temperature: 20, barometricPressure: 30.15, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'high' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2022-12-15T16:00:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'W', temperature: 30, barometricPressure: 29.80, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'recovery', vegetationState: 'snow', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2022.id, season: 2022, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2022-12-20T02:30:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', temperature: 15, barometricPressure: 30.60, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'low' },

    // 2023 Season (20 sightings)
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-09-28T06:45:00'), locationMarkerId: 'cam_east_ridge', behavior: 'feeding', travelDirection: 'S', temperature: 52, barometricPressure: 30.05, pressureTrend: 'steady', timeOfDay: 'dawn', rutPhase: 'pre_rut', vegetationState: 'green', huntingPressure: 'none', notes: 'Velvet just shed. Looking heavier this year.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-10-05T17:30:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'E', temperature: 58, barometricPressure: 29.95, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2023-10-08T23:15:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', travelDirection: 'E', temperature: 48, barometricPressure: 30.10, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2023-10-12T17:00:00'), locationMarkerId: 'stand_south_field', behavior: 'feeding', travelDirection: 'W', windDirection: 'NW', temperature: 50, barometricPressure: 30.20, pressureTrend: 'rising', timeOfDay: 'afternoon', rutPhase: 'pre_rut', vegetationState: 'peak_color', huntingPressure: 'low', notes: 'Exceptional mast year. White oaks loaded. He is hitting them hard.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, type: 'sign_only', observedAt: new Date('2023-10-11T09:00:00'), locationMarkerId: 'scrape_cluster_east', behavior: 'scraping', windDirection: 'W', temperature: 45, rutPhase: 'pre_rut', notes: 'Scrape cluster going active again. Right on schedule Oct 10-14 window.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2023-10-18T00:45:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'rubbing', travelDirection: 'S', temperature: 40, barometricPressure: 29.75, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'none', notes: 'Ghost hitting rub line. Telephone pole sized rub on white oak.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2023-10-25T06:20:00'), locationMarkerId: 'stand_east_ridge', behavior: 'traveling', travelDirection: 'SE', windDirection: 'NW', temperature: 35, barometricPressure: 29.60, pressureTrend: 'falling', timeOfDay: 'dawn', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'low', notes: 'Pre-front morning. Cold front arriving. He was on his feet early and cruising.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-10-30T15:45:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'chasing', travelDirection: 'N', temperature: 40, barometricPressure: 30.30, pressureTrend: 'rising', timeOfDay: 'afternoon', rutPhase: 'chasing', vegetationState: 'post_drop', huntingPressure: 'moderate', doeGroupId: 'creek-bottom-group', notes: 'Chasing doe from creek bottom group across creek crossing.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2023-11-02T02:00:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'W', temperature: 38, barometricPressure: 30.10, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'chasing', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2023-11-05T16:15:00'), locationMarkerId: 'stand_creek_funnel', behavior: 'chasing', travelDirection: 'E', windDirection: 'S', temperature: 42, barometricPressure: 29.50, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'moderate', doeGroupId: 'south-field-group', notes: 'BEST SIGHTING OF 2023. Chasing 2 does through creek funnel. 30 yards. Passed — he is only 4.5.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2023-11-08T15:45:00'), locationMarkerId: 'cam_south_field', behavior: 'chasing', travelDirection: 'N', temperature: 35, barometricPressure: 29.40, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'moderate', notes: 'Crab Claw DAYLIGHT chasing phase hit! One per year like clockwork.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2023-11-07T01:30:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'S', temperature: 33, barometricPressure: 29.85, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'peak_rut', huntingPressure: 'moderate', notes: 'Ghost crossed the creek for the first time on record! 1:30AM. Rut drawing him south.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-11-12T07:00:00'), locationMarkerId: 'cam_east_ridge', behavior: 'tending', travelDirection: 'S', temperature: 30, barometricPressure: 30.15, pressureTrend: 'rising', timeOfDay: 'morning', rutPhase: 'lockdown', vegetationState: 'bare', huntingPressure: 'moderate', notes: 'With doe. Locked down near east ridge bedding.' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2023-11-15T02:15:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', travelDirection: 'N', temperature: 28, barometricPressure: 30.25, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'lockdown', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-11-20T06:30:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'E', temperature: 25, barometricPressure: 30.40, pressureTrend: 'rising', timeOfDay: 'dawn', rutPhase: 'post_rut', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2023-11-22T23:00:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', temperature: 22, barometricPressure: 30.50, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'post_rut', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-12-01T16:00:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'SW', temperature: 28, barometricPressure: 29.90, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'recovery', vegetationState: 'bare', huntingPressure: 'high' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2023-12-10T01:00:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'bedded', temperature: 15, barometricPressure: 30.60, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'high' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2023-12-18T07:15:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'S', temperature: 20, barometricPressure: 30.10, pressureTrend: 'steady', timeOfDay: 'morning', rutPhase: 'recovery', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2023.id, season: 2023, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2023-12-25T00:15:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', temperature: 10, barometricPressure: 30.70, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'none' },

    // 2024 Season (20 sightings)
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-10-01T17:00:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'W', temperature: 60, barometricPressure: 30.00, pressureTrend: 'steady', timeOfDay: 'afternoon', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none', notes: 'Poor mast year — hitting food plot hard early. Already 5.5yr, looks incredible.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-10-05T06:15:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'E', temperature: 50, barometricPressure: 30.15, pressureTrend: 'rising', timeOfDay: 'dawn', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2024-10-08T00:30:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'W', temperature: 48, barometricPressure: 29.85, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'pre_rut', vegetationState: 'early_color', huntingPressure: 'none' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2024-10-10T02:00:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'rubbing', travelDirection: 'S', temperature: 45, barometricPressure: 29.70, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'pre_rut', vegetationState: 'peak_color', huntingPressure: 'none', notes: 'Ghost back in sanctuary. Same rub trees as previous years.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, type: 'sign_only', observedAt: new Date('2024-10-13T08:30:00'), locationMarkerId: 'scrape_cluster_east', behavior: 'scraping', temperature: 42, rutPhase: 'pre_rut', notes: 'Scrape cluster active Oct 13 this year. Slightly later than usual.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2024-10-18T17:15:00'), locationMarkerId: 'stand_south_field', behavior: 'scraping', travelDirection: 'N', windDirection: 'NW', temperature: 40, barometricPressure: 29.55, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'low', notes: 'Working mock scrape near food plot. Pre-front evening. Incredible rack at 5.5.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-10-22T06:30:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'S', temperature: 38, barometricPressure: 30.25, pressureTrend: 'rising', timeOfDay: 'dawn', rutPhase: 'seeking', vegetationState: 'post_drop', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2024-10-25T01:00:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'E', temperature: 35, barometricPressure: 29.90, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'seeking', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2024-10-28T06:45:00'), locationMarkerId: 'stand_east_ridge', behavior: 'chasing', travelDirection: 'SE', windDirection: 'NW', temperature: 30, barometricPressure: 29.45, pressureTrend: 'falling', timeOfDay: 'dawn', rutPhase: 'chasing', vegetationState: 'bare', huntingPressure: 'moderate', doeGroupId: 'south-field-group', notes: 'COLD FRONT MORNING. Best barometric window of 2024. Chasing doe at 6:45AM. 35 yards. Almost had a shot.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2024-11-01T14:30:00'), locationMarkerId: 'cam_south_field', behavior: 'chasing', travelDirection: 'N', temperature: 38, barometricPressure: 29.35, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'chasing', vegetationState: 'bare', huntingPressure: 'moderate', notes: 'Crab Claw daylight chasing hit! Right on schedule. Falling barometer.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-11-03T07:00:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'N', temperature: 35, barometricPressure: 30.20, pressureTrend: 'rising', timeOfDay: 'morning', rutPhase: 'peak_rut', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2024-11-05T23:30:00'), locationMarkerId: 'cam_creek_crossing', behavior: 'traveling', travelDirection: 'S', temperature: 32, barometricPressure: 29.75, pressureTrend: 'falling', timeOfDay: 'night', rutPhase: 'peak_rut', huntingPressure: 'moderate', notes: 'Ghost at creek crossing again during peak rut. 11:30PM. Only time he leaves sanctuary.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'in_person', observedAt: new Date('2024-11-07T16:30:00'), locationMarkerId: 'stand_south_field', behavior: 'tending', travelDirection: 'E', windDirection: 'N', temperature: 38, barometricPressure: 29.50, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'peak_rut', vegetationState: 'bare', huntingPressure: 'moderate', doeGroupId: 'south-field-group', notes: 'Tending doe in south field. 50 yards. Wind shifted. He winded me and walked off slowly.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-11-12T06:00:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', travelDirection: 'SE', temperature: 28, barometricPressure: 30.30, pressureTrend: 'rising', timeOfDay: 'dawn', rutPhase: 'lockdown', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2024-11-14T01:45:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', temperature: 25, barometricPressure: 30.40, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'lockdown', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-11-18T16:45:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'W', temperature: 30, barometricPressure: 30.10, pressureTrend: 'steady', timeOfDay: 'afternoon', rutPhase: 'post_rut', huntingPressure: 'low' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([crabClaw.id]), type: 'trail_cam', observedAt: new Date('2024-11-20T22:30:00'), locationMarkerId: 'cam_east_ridge', behavior: 'traveling', temperature: 25, barometricPressure: 30.20, pressureTrend: 'rising', timeOfDay: 'night', rutPhase: 'post_rut', huntingPressure: 'moderate' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id]), type: 'trail_cam', observedAt: new Date('2024-12-05T07:00:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'S', temperature: 20, barometricPressure: 30.50, pressureTrend: 'rising', timeOfDay: 'morning', rutPhase: 'recovery', vegetationState: 'snow', huntingPressure: 'high', notes: 'Gun season. Still on food plot. Poor mast year keeping him predictable.' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([ghost.id]), type: 'trail_cam', observedAt: new Date('2024-12-10T00:00:00'), locationMarkerId: 'cam_north_sanctuary', behavior: 'traveling', temperature: 12, barometricPressure: 30.65, pressureTrend: 'steady', timeOfDay: 'night', rutPhase: 'recovery', huntingPressure: 'high' },
    { propertyId: property.id, seasonId: s2024.id, season: 2024, deerIds: JSON.stringify([mainFrame.id, crabClaw.id]), type: 'trail_cam', observedAt: new Date('2024-12-20T16:30:00'), locationMarkerId: 'cam_south_field', behavior: 'feeding', travelDirection: 'W', temperature: 18, barometricPressure: 29.75, pressureTrend: 'falling', timeOfDay: 'afternoon', rutPhase: 'recovery', vegetationState: 'snow', huntingPressure: 'low', notes: 'Both Main Frame and Crab Claw on food plot together. Late season bachelor behavior returning.' },
  ]

  await prisma.sighting.createMany({ data: sightingData })

  // === SIGN OBSERVATIONS ===
  const signData = [
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2022-10-14'), season: 2022, status: 'active', scrapeSize: 'community', notes: '4 scrapes within 50 yards, all freshened' },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2022-11-05'), season: 2022, status: 'active', scrapeSize: 'community', notes: 'All scrapes hammered during peak rut' },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2022-11-20'), season: 2022, status: 'cold', scrapeSize: 'community', notes: 'Post-rut, scrapes going cold' },
    { propertyId: property.id, lat: 39.033, lng: -82.599, type: 'rub', observedAt: new Date('2022-10-15'), season: 2022, status: 'fresh', rubSize: 'arm', notes: 'Fresh rub on white oak, east ridge trail' },
    { propertyId: property.id, lat: 39.034, lng: -82.600, type: 'rub', observedAt: new Date('2022-10-15'), season: 2022, status: 'fresh', rubSize: 'telephone_pole', notes: 'MASSIVE rub on 8" white oak. Ghost territory.', associatedDeerIds: JSON.stringify(['ghost']) },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2023-10-11'), season: 2023, status: 'fresh', scrapeSize: 'community', notes: 'Annual activation right on schedule' },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2023-11-01'), season: 2023, status: 'active', scrapeSize: 'community', notes: 'Peak activity' },
    { propertyId: property.id, lat: 39.034, lng: -82.600, type: 'rub', observedAt: new Date('2023-10-18'), season: 2023, status: 'fresh', rubSize: 'telephone_pole', notes: 'Same tree as last year. Ghost hitting it again.', associatedDeerIds: JSON.stringify(['ghost']) },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2024-10-13'), season: 2024, status: 'fresh', scrapeSize: 'community', notes: 'Scrape cluster active Oct 13, slightly later' },
    { propertyId: property.id, markerId: 'scrape_cluster_east', type: 'scrape', observedAt: new Date('2024-10-28'), season: 2024, status: 'active', scrapeSize: 'community', notes: 'Peak scrape activity during chasing phase' },
    { propertyId: property.id, lat: 39.034, lng: -82.600, type: 'rub', observedAt: new Date('2024-10-10'), season: 2024, status: 'fresh', rubSize: 'telephone_pole', notes: 'Third year on same tree. Definitely Ghost.', associatedDeerIds: JSON.stringify(['ghost']) },
    { propertyId: property.id, lat: 39.031, lng: -82.606, type: 'bed', observedAt: new Date('2024-10-20'), season: 2024, status: 'active', notes: 'Fresh beds near west pinch point. Doe beds.' },
  ]

  await prisma.signObservation.createMany({ data: signData })

  // === STAND INTRUSION LOGS ===
  const standLogs = [
    { propertyId: property.id, standMarkerId: 'stand_east_ridge', huntedAt: new Date('2022-10-15T05:30:00'), season: 2022, windDirection: 'NW', outcome: 'target_seen', notes: 'Saw Main Frame at 25 yards. Let him walk.', entryRoute: JSON.stringify(['entry_creek_bottom']), exitRoute: JSON.stringify(['exit_field_edge']) },
    { propertyId: property.id, standMarkerId: 'stand_south_field', huntedAt: new Date('2022-10-28T14:00:00'), season: 2022, windDirection: 'NW', outcome: 'target_seen', notes: 'Main Frame chasing through south field.' },
    { propertyId: property.id, standMarkerId: 'stand_east_ridge', huntedAt: new Date('2022-11-08T05:30:00'), season: 2022, windDirection: 'NW', outcome: 'target_seen', notes: 'Main Frame locked down with doe. No shot.' },
    { propertyId: property.id, standMarkerId: 'stand_east_ridge', huntedAt: new Date('2023-10-25T05:15:00'), season: 2023, windDirection: 'NW', outcome: 'target_seen', notes: 'Pre-front morning. Main Frame cruising at dawn.' },
    { propertyId: property.id, standMarkerId: 'stand_creek_funnel', huntedAt: new Date('2023-11-05T13:00:00'), season: 2023, windDirection: 'S', outcome: 'target_seen', notes: 'BEST SIGHTING. Main Frame chasing does through funnel at 30 yards.' },
    { propertyId: property.id, standMarkerId: 'stand_south_field', huntedAt: new Date('2023-10-12T14:00:00'), season: 2023, windDirection: 'NW', outcome: 'target_seen', notes: 'Main Frame feeding on white oaks.' },
    { propertyId: property.id, standMarkerId: 'stand_south_field', huntedAt: new Date('2024-10-18T14:30:00'), season: 2024, windDirection: 'NW', outcome: 'target_seen', notes: 'Main Frame working mock scrape near food plot.' },
    { propertyId: property.id, standMarkerId: 'stand_east_ridge', huntedAt: new Date('2024-10-28T05:30:00'), season: 2024, windDirection: 'NW', outcome: 'target_seen', notes: 'Cold front morning. Main Frame chasing at 35 yards. Almost had shot.', entryRoute: JSON.stringify(['entry_creek_bottom']), exitRoute: JSON.stringify(['exit_field_edge']) },
    { propertyId: property.id, standMarkerId: 'stand_south_field', huntedAt: new Date('2024-11-07T14:00:00'), season: 2024, windDirection: 'N', outcome: 'deer_spooked', bumped: true, notes: 'Wind shifted. Main Frame winded me. He walked off. Need N wind to be more NW here.' },
    { propertyId: property.id, standMarkerId: 'stand_east_ridge', huntedAt: new Date('2024-11-10T05:30:00'), season: 2024, windDirection: 'W', outcome: 'no_deer_seen', notes: 'Dead morning. Pressure too high from gun season excitement.' },
  ]

  await prisma.standIntrusionLog.createMany({ data: standLogs })

  console.log('Seed complete!')
  console.log(`  Property: ${property.name}`)
  console.log(`  Seasons: 3 (2022, 2023, 2024)`)
  console.log(`  Markers: ${markers.length}`)
  console.log(`  Deer: 4 (Main Frame 10, Crab Claw, Ghost, Old Girl)`)
  console.log(`  Sightings: ${sightingData.length}`)
  console.log(`  Sign observations: ${signData.length}`)
  console.log(`  Stand intrusion logs: ${standLogs.length}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
