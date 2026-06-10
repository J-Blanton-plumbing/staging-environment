<?php /* Template Name: Why J. Blanton */ get_header();
// --- 2026-04-20: ACF overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'WHY J. BLANTON';
$hero_subheading  = get_field( 'hero_subheading' )  ?: 'At J Blanton, we understand the importance of an owner\'s home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.';
$hero_description = get_field( 'hero_description' ) ?: 'For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.';

$whyjb_about_heading  = get_field( 'whyjb_about_heading' )  ?: 'ABOUT US';
$whyjb_about_text     = get_field( 'whyjb_about_text' )     ?: '<p>At J. Blanton Plumbing, we\'ve proudly served Chicagoland since 1993, solving plumbing problems for families with unmatched expertise and 5-star service. For over 30 years, our commitment to quality and cutting-edge solutions has made us a trusted name in the plumbing industry. With offices throughout the Chicagoland region, we deliver modern plumbing services while staying dedicated to the growth and success of skilled trades for future generations.</p>';
$whyjb_expect_heading = get_field( 'whyjb_expect_heading' ) ?: 'WHAT TO EXPECT';
$whyjb_expect_text    = get_field( 'whyjb_expect_text' )    ?: '<p>When you choose J. Blanton Plumbing, you can expect same-day service, clear upfront pricing, and professional care every step of the way. Our licensed and bonded technicians arrive in fully stocked vehicles, ready to handle any repair or service on the spot. With highly trained, uniformed experts at your service, you\'ll enjoy a hassle-free experience from start to finish.</p>';
$whyjb_team_heading   = get_field( 'whyjb_team_heading' )   ?: 'MEET OUR TEAM';
$whyjb_team_text      = get_field( 'whyjb_team_text' )      ?: '<p>Our team of licensed, bonded, and highly trained plumbing professionals is passionate about providing exceptional service. Each technician is equipped with the expertise, tools, and professionalism to get the job done right the first time. When you call J. Blanton Plumbing, you\'re not just getting a plumber—you\'re getting a dedicated team committed to your satisfaction.</p>';
$whyjb_loc_heading    = get_field( 'whyjb_loc_heading' )    ?: 'OUR LOCATIONS';
$whyjb_loc_text       = get_field( 'whyjb_loc_text' )       ?: '<p>With multiple locations across Chicagoland, J. Blanton Plumbing is always nearby to serve your community. Our wide coverage ensures same-day emergency response, bringing reliable and efficient plumbing solutions to your neighborhood. No matter where you are, we\'re ready to help.</p>';
$whyjb_join_heading   = get_field( 'whyjb_join_heading' )   ?: 'JOIN OUR TEAM';
$whyjb_join_text      = get_field( 'whyjb_join_text' )      ?: '<p>Join the JBP Team and grow with a company that values teamwork, education, and providing a 5-star customer experience. Enjoy competitive pay, comprehensive benefits, including health insurance, paid time off, a company truck, and opportunities for ongoing training in sales, leadership, and mechanical techniques. Qualified candidates with a plumbing license and residential experience can apply today.</p>';
?>
<div class="hero">
	<iframe class="img-s" src="https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?controls=0&rel=0&fs=0" title="The J. Blanton Difference" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<div class="involveme_popup" data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid=' data-project="schedule-service-new" data-embed-mode="popup" data-trigger-event="button" data-popup-size="medium" data-organization-url="https://jblantonplumbing.involve.me"><p>SCHEDULE A SERVICE</p></div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="w-aboutus">
	<div class="pv"><div class="w81">
		<div>
			<p class="red-text"><?php echo esc_html( $whyjb_about_heading ); ?></p>
			<?php echo wp_kses_post( $whyjb_about_text ); ?>
		</div>
		<p class="red-text red-text-mobile"><?php echo esc_html( $whyjb_about_heading ); ?></p>
		<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
		<div class="mobile-content">
			<?php echo wp_kses_post( $whyjb_about_text ); ?>
		</div>
	</div></div>
	<div class="wte"><div class="w81">
		<p class="red-text red-text-mobile"><?php echo esc_html( $whyjb_expect_heading ); ?></p>
		<img class="lazy" alt="Man" data-src="https://d1rplazj5a80fb.cloudfront.net/images/expect-whyjb.webp" />
		<div>
			<p class="red-text"><?php echo esc_html( $whyjb_expect_heading ); ?></p>
			<?php echo wp_kses_post( $whyjb_expect_text ); ?>
		</div>
	</div></div>
	<div class="team"><div class="w81">
		<div class="l"><div>
			<p class="red-text"><?php echo esc_html( $whyjb_team_heading ); ?></p>
			<?php echo wp_kses_post( $whyjb_team_text ); ?>
		</div></div>
		<div class="r">
			<p class="red-text red-text-mobile"><?php echo esc_html( $whyjb_team_heading ); ?></p>
			<img class="lazy" alt="Man" data-src="https://d1rplazj5a80fb.cloudfront.net/images/meet-team.webp" />
		</div>
	</div></div>
	<div class="wte lws"><div class="w81">
		<p class="red-text red-text-mobile"><?php echo esc_html( $whyjb_loc_heading ); ?></p>
		<img class="lazy" alt="City" data-src="https://d1rplazj5a80fb.cloudfront.net/images/locations2.png" />
		<div>
			<p class="red-text"><?php echo esc_html( $whyjb_loc_heading ); ?></p>
			<?php echo wp_kses_post( $whyjb_loc_text ); ?>
			<a href="<?php echo esc_url(home_url('/locations')); ?>" class="link-button">VIEW OUR LOCATIONS AND COVERAGE AREA</a>
		</div>
	</div></div>
	<div class="guarantee"><div class="w81">
		<div class="l"><div>
			<p class="red-text"><?php echo esc_html( $whyjb_join_heading ); ?></p>
			<?php echo wp_kses_post( $whyjb_join_text ); ?>
		</div>
		<a href="<?php echo esc_url(home_url('/j-blanton-is-hiring')); ?>" class="link-button">Join our Team</a></div>
		<img class="lazy" alt="Man" data-src="https://d1rplazj5a80fb.cloudfront.net/images/hiring.webp" />
	</div></div>
</div>
<?php get_footer(); ?>
