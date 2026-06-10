<?php /* Template Name: Is Hiring */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
// NOTE: /j-blanton-is-hiring page uses page-city.php, not this template (see post-migration Fix 5).
// This template remains for any future page that selects it via Page Attributes.
$hero_heading     = get_field( 'hero_heading' )     ?: 'JOIN THE J. BLANTON TEAM';
$hero_description = get_field( 'hero_description' ) ?: 'Join the JBP Team: Careers in Plumbing with Competitive Benefits & Growth Opportunities. We Are Hiring!';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/hiring.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="J. Blanton Is Hiring" />
	<h1><?php echo esc_html( $hero_heading ); ?></h1>
	<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
	<a class="hero-link-button" href="https://i.jblantonplumbing.com/careers"><p>JOIN US</p></a>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="cream"><div class="w81 hiring"><div class="f">
	<div>
		<p class="red-text">Join the JBP Team: Careers in Plumbing with Competitive Benefits &amp; Growth Opportunities We Are Hiring!</p>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" alt="Plumbing" />
		<p>Take the next step in your career—apply today to join the JBP team!</p>
		<p>At J. Blanton Plumbing, we foster a culture built on teamwork, continuous learning, and professional growth. We are committed to providing our employees with a supportive work environment and the tools they need to deliver top-tier, 5-star service.</p>
		<p class="list-label">Benefits We Offer:</p>
		<ul><li>Hourly Pay</li><li>Commission on Sales</li><li>401k</li><li>Health Insurance</li><li>Paid Vacation, Sick Days, and Personal Days</li><li>Company Truck</li><li>Gas Card</li><li>iPhone &amp; iPad</li><li>Brand-New Uniforms</li><li>Bonuses</li></ul>
		<p class="list-label">What We're Looking For:</p>
		<ul><li>State of Illinois or City of Chicagoland Plumbing License</li><li>Residential Plumbing Experience</li><li>Valid Driver's License</li><li>Clean Background Check and Drug Test</li></ul>
		<p class="list-label">Current Position Available:</p>
		<ul><li>Service Plumber – Minimum 5 years of experience required</li></ul>
	</div>
	<div style="max-width:480px;width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;">
		<iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/XO4t-pte8PA" title="J. Blanton Careers" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="border-radius:8px;"></iframe>
	</div>
</div>
<div class="ep-map">
	<div class="ep-contents"><div class="map2"><div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div></div>
		<p class="red-text">WE'RE ALMOST EVERYWHERE</p>
		<p>With multiple locations across Chicagoland, J. Blanton Plumbing is always nearby to serve your community.</p>
	</div>
	<div class="map1"><div class="elfsight-app-9da0734e-a27e-4557-85a0-da9b69617829" data-elfsight-app-lazy></div></div>
</div>
<div class="ep-gr"><div class="elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b" data-elfsight-app-lazy></div></div>
</div></div>
<?php get_footer(); ?>
