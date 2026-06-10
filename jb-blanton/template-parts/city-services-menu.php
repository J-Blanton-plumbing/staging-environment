<?php
/**
 * Template part: City services menu (accordion/details).
 * Passed arg: $args['city_slug'] — lowercase city slug for URL building.
 */
$city_slug = $args['city_slug'] ?? '';

$services = [
	'Plumbing' => [
		'icon' => 'u_shape_tube.svg',
		'links' => [
			'burst-pipe-repair'                    => 'Burst Pipe Repair',
			'emergency-plumbing'                   => 'Emergency Plumbing',
			'faucet-installation-repair'           => 'Faucet Installation & Repair',
			'garbage-disposal-installation-repair' => 'Garbage Disposal Installation & Repair',
			'kitchen-faucet-repair-and-installation' => 'Kitchen Faucet Repair & Installation',
			'kitchen-plumbing'                     => 'Kitchen Plumbing',
			'leak-repairs'                         => 'Leak Repairs',
			'plumbing-fixture-installations'       => 'Plumbing Fixture Installations',
			'plumbing-maintenance'                 => 'Plumbing Maintenance',
			'shower-repair'                        => 'Shower Repair',
			'toilet-installation-repair'           => 'Toilet Installation & Repair',
		],
	],
	'Gas Lines' => [
		'icon' => 'boiler.svg',
		'links' => [
			'gas-fireplace'         => 'Gas Fireplace',
			'gas-line-installation' => 'Gas Line Installation',
			'gas-line-leak-detection' => 'Gas Line Leak Detection',
			'gas-line-repair'       => 'Gas Line Repair',
		],
	],
	'Water Filtration Systems' => [
		'icon' => 'water_droplet.svg',
		'links' => [
			'water-filtration-systems' => 'Water Filtration Systems',
			'water-testing'            => 'Water Testing',
		],
	],
	'Water Heater Services' => [
		'icon' => 'waterfaucet.svg',
		'links' => [
			'commercial-water-heater'   => 'Commercial Water Heater',
			'residential-water-heater'  => 'Residential Water Heater',
			'tankless-water-heater'     => 'Tankless Water Heater',
			'water-heater-installation' => 'Water Heater Installation',
			'water-heater-maintenance'  => 'Water Heater Maintenance',
			'water-heater-repair'       => 'Water Heater Repair',
		],
	],
	'Sewer & Drain' => [
		'icon' => 'sink.svg',
		'links' => [
			'basement-flooding'             => 'Basement Flooding',
			'basement-waterproofing'        => 'Basement Waterproofing',
			'catch-basin'                   => 'Catch Basin',
			'clogged-drains'                => 'Clogged Drains',
			'drain-cleaning'                => 'Drain Cleaning',
			'ejector-pump'                  => 'Ejector Pump',
			'hydro-jetting'                 => 'Hydro Jetting',
			'kitchen-sink-drain'            => 'Kitchen Sink Drain',
			'overhead-sewer-systems'        => 'Overhead Sewer Systems',
			'sewage-line-backup-services'   => 'Sewage Line Backup Services',
			'sewer-drain-clearing'          => 'Sewer Drain Clearing',
			'sewer-maintenance'             => 'Sewer Maintenance',
			'sewer-repair'                  => 'Sewer Repair',
			'sewer-rodding'                 => 'Sewer Rodding',
			'sump-pumps'                    => 'Sump Pumps',
			'trenchless-sewer-repair'       => 'Trenchless Sewer Repair',
			'video-camera-sewer-inspections'=> 'Video Camera Sewer &amp; Drain Inspections',
		],
	],
];
?>
<div class="city-sub-categories">
	<div class="services-row">
		<?php foreach ( $services as $cat_name => $cat ) : ?>
		<details class="service-category">
			<summary>
				<img class="icon-text" alt="<?php echo esc_attr( $cat_name ); ?>"
					src="https://d1rplazj5a80fb.cloudfront.net/images/<?php echo esc_attr( $cat['icon'] ); ?>" />
				<?php echo esc_html( $cat_name ); ?>
			</summary>
			<ul>
				<?php foreach ( $cat['links'] as $service_slug => $service_label ) : ?>
				<li>
					<a href="<?php echo esc_url( home_url( '/' . $city_slug . '/' . $service_slug ) ); ?>">
						<?php echo $service_label; // Already escaped or contains &amp; ?>
					</a>
				</li>
				<?php endforeach; ?>
			</ul>
		</details>
		<?php endforeach; ?>
	</div>
</div>
