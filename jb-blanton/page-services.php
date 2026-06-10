<?php /* Template Name: Services Overview */ get_header(); ?>
<div class="services-overview">
<div class="hero">
	<img class="img-s" src="https://d1rplazj5a80fb.cloudfront.net/images/clogged-drains.webp" alt="Services" />
	<div class="contents">
		<div class="w">
			<h1>SERVICES</h1>
			<p class="sub-label"></p>
			<p class="hero-desc">Whether you are remodeling your kitchen or bathroom or you have an emergency water leak, count on J. Blanton Plumbing to help you with all your plumbing needs.</p>
			<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE A SERVICE</p></div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="so w81">
	<div class="align2">
		<p class="red-text">SERVICES</p>
		<p>Our team of tenacious plumbers is always ready to leap into action to save your day, no matter how light or severe the situation</p>
	</div>
	<?php
	$cf = 'https://d1rplazj5a80fb.cloudfront.net/images/';
	$svgarrow = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>';
	$svgchev = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19 9l-7 6l-7-6"/></svg>';
	$svgarrow2 = '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m22 6l8 10l-8 10m8-10H2"/></svg>';
	$services = [
		['Emergency',    'phone.svg',        'emergency-plumbing', 'We offer fast drain and plumbing services for emergencies.'],
		['Plumbing',     'u_shape_tube.svg', 'plumbing',           'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.'],
		['Sewer',        'home.svg',         'sewer',              'Sewer services ensure clogs are resolved and plumbing stays smooth.'],
		['Drain',        'sink.svg',         'drain',              'Drain services keep your home\'s plumbing running smoothly.'],
		['Water Heater', 'waterfaucet.svg',  'water-heater',       'Ensure consistent hot water with J. Blanton Plumbing\'s.'],
		['Water Quality','water_droplet.svg','water-quality',      'Water filtration ensures clean, safe water and protects your health and plumbing.'],
		['Commercial',   'home.svg',         'commercial',         'Reliable and efficient plumbing solutions tailored to meet the needs of your business.'],
	];
	?>
	<div class="services">
		<div class="services-contents-mobile">
			<?php foreach($services as $i => $s): ?>
			<div class="service-card not-active">
				<div id="inner<?php echo $i; ?>">
					<div id="service-header<?php echo $i; ?>" class="service-header">
						<p class="service-label"><?php echo esc_html($s[0]); ?></p>
						<?php echo $svgchev; ?>
					</div>
					<p><?php echo esc_html($s[3]); ?></p>
					<a href="<?php echo esc_url(home_url('/'.$s[2])); ?>">
						<p>Read more</p><?php echo $svgarrow2; ?>
					</a>
				</div>
			</div>
			<?php endforeach; ?>
			<a class="link-button" href="<?php echo esc_url(home_url('/services')); ?>">VIEW ALL SERVICES</a>
		</div>
		<div class="services-contents">
			<?php
			$commercial_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M176 416v64M80 32h192a32 32 0 0 1 32 32v412a4 4 0 0 1-4 4H48h0V64a32 32 0 0 1 32-32m240 160h112a32 32 0 0 1 32 32v256h0h-160h0V208a16 16 0 0 1 16-16"/><path fill="currentColor" d="M98.08 431.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 240a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 320a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79"/><ellipse cx="256" cy="176" fill="currentColor" rx="15.95" ry="16.03" transform="rotate(-45 255.99 175.996)"/><path fill="currentColor" d="M258.08 111.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79M400 400a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-64 160a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16"/></svg>';
			foreach($services as $s): ?>
			<div class="image-card">
				<div class="img">
					<?php if ($s[0] === 'Commercial'): ?>
						<?php echo $commercial_svg; ?>
					<?php else: ?>
					<img class="lazy" data-src="<?php echo esc_url($cf.$s[1]); ?>" alt="<?php echo esc_attr($s[0]); ?>" />
					<?php endif; ?>
				</div>
				<div class="image-card-content">
					<p class="service-label"><?php echo esc_html($s[0]); ?></p>
					<p class="desc"><?php echo esc_html($s[3]); ?></p>
					<a href="<?php echo esc_url(home_url('/'.$s[2])); ?>">
						<p>Read more</p><?php echo $svgarrow; ?>
					</a>
				</div>
			</div>
			<?php endforeach; ?>
		</div>
		<script>
		(() => {
			const serviceCards = document.querySelectorAll(".service-card");
			serviceCards.forEach((v, i) => {
				const inner = document.getElementById(`inner${i}`);
				const header = document.getElementById(`service-header${i}`);
				let headerClicked = false;
				v.addEventListener("click", () => {
					if(v.classList.contains("active") || headerClicked) { headerClicked = false; return; }
					v.classList.add("active"); v.classList.remove("not-active");
					v.style.height = `${inner.offsetHeight}px`;
				});
				header.addEventListener("click", () => {
					if(!v.classList.contains("active")) return;
					headerClicked = true;
					v.classList.add("not-active"); v.classList.remove("active");
					v.style.height = window.innerWidth < 426 ? "23px" : "30px";
				});
			});
		})();
		</script>
	</div>
</div>
<div class="services-ndc">
	<div class="no-drip-club">
		<img class="lazy character" data-src="<?php echo esc_url($cf.'jbcharacter.webp'); ?>" alt="J. Blanton Character" />
		<div class="no-drip-red"></div>
		<div class="no-drip-labels"><p>NO DRIP CLUB</p><p>NO DRIP CLUB</p></div>
		<div class="no-drip-content">
			<p>There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.</p>
			<a href="<?php echo esc_url(home_url('/no-drip-club')); ?>">JOIN THE NO DRIP CLUB</a>
		</div>
	</div>
</div>
<div class="services-section3 w81">
	<div>
		<p class="red-text">REASONS TO BELIEVE</p>
		<p class="m text">For over three decades, we have established ourselves as a trusted name in the plumbing industry. Our team is passionate about providing top-of-the-line technology and exceptional customer service to meet all your plumbing needs.</p>
	</div>
	<div>
		<p class="red-text">REASONS TO BELIEVE</p>
		<img class="lazy" data-src="<?php echo esc_url($cf.'manplumber.webp'); ?>" alt="Plumber" />
	</div>
</div>
<div class="services-google-reviews">
	<div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div>
</div>
<p class="services-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
<div class="services-tiktok">
	<div class="elfsight-app-9f370c11-108b-412b-8529-6b3f093f04a3" data-elfsight-app-lazy></div>
</div>
</div>
<?php get_footer(); ?>
