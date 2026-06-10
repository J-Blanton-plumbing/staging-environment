<?php /* Template Name: Help and Support */ get_header();
// --- 2026-04-20: ACF hero overrides. Empty fields → original strings. ---
$hero_heading     = get_field( 'hero_heading' )     ?: 'J BLANTON PLUMBING - WE\'RE HERE TO HELP';
$hero_subheading  = get_field( 'hero_subheading' )  ?: '';
$hero_description = get_field( 'hero_description' ) ?: 'Find answers, support, and solutions for all your plumbing needs – right when you need them.';
$hero_image_src   = jb_resolve_hero_image( get_field( 'hero_image_override' ), 'https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp' );
?>
<div class="hero">
	<img class="img-s" src="<?php echo esc_url( $hero_image_src ); ?>" alt="Help S Hero" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $hero_heading ); ?></h1>
			<p class="sub-label"><?php echo esc_html( $hero_subheading ); ?></p>
			<p class="hero-desc"><?php echo esc_html( $hero_description ); ?></p>
			<div class="involveme_popup hero-link-button"
				data-params='source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid='
				data-project="contact-us"
				data-embed-mode="popup"
				data-trigger-event="button"
				data-popup-size="medium"
				data-organization-url="https://jblantonplumbing.involve.me"><p>CONTACT US</p></div>
		</div>
		<img class="lazy" data-src="https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp" alt="" />
	</div>
</div>
<?php get_template_part('template-parts/hero','nav'); ?>
<div class="w-aboutus">
	<div class="pv">
		<div class="w81">
			<div>
				<p class="red-text">CUSTOMER SERVICE</p>
				<p>At J Blanton Plumbing, customer satisfaction is our top priority. Whether you have questions about a recent service, need assistance scheduling an appointment, or wnat to know more about our offerings, our friendly customer service team is here to help. Contact us today, and we'll ensure your experience is smooth and stress-free.</p>
			</div>
			<p class="red-text red-text-mobile">CUSTOMER SERVICE</p>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp" />
			<div class="mobile-content">
				<p>At J Blanton Plumbing, customer satisfaction is our top priority. Whether you have questions about a recent service, need assistance scheduling an appointment, or wnat to know more about our offerings, our friendly customer service team is here to help. Contact us today, and we'll ensure your experience is smooth and stress-free.</p>
			</div>
		</div>
	</div>
	<div class="wte lws">
		<div class="w81">
			<p class="red-text red-text-mobile">BILLING QUESTIONS</p>
			<img class="lazy" alt="City" data-src="https://d1rplazj5a80fb.cloudfront.net/images/billing-q.webp" />
			<div>
				<p class="red-text">BILLING QUESTIONS</p>
				<p>Have questions about your invoice or payment options? Our billing team is ready to assist you. Whether you need clarification on a charge, want to set up a payment plan, or explore financing options, we're here to provide clear and simple solutions. Reach out to us for fast, accurate answers.</p>
			</div>
		</div>
	</div>
	<div class="pv">
		<div class="w81">
			<div>
				<p class="red-text">HAVE A PLUMBING ISSUE?</p>
				<p>Dealing with a plumbing problem? Don't worry – J Blanton Plumbing is here to help. From emergency repairs to routine maintenance, our licensed professionals are just a call away. Click the button below to schedule a service and let us quickly diagnose the issue and provide reliable, high-quality solutions to get your home or business back on track.</p>
			</div>
			<p class="red-text red-text-mobile">HAVE A PLUMBING ISSUE?</p>
			<img class="lazy" alt="Preventative" data-src="https://d1rplazj5a80fb.cloudfront.net/images/plumbing-help.webp" />
			<div class="mobile-content">
				<p>Dealing with a plumbing problem? Don't worry – J Blanton Plumbing is here to help. From emergency repairs to routine maintenance, our licensed professionals are just a call away. Click the button below to schedule a service and let us quickly diagnose the issue and provide reliable, high-quality solutions to get your home or business back on track.</p>
			</div>
		</div>
	</div>
</div>
<?php get_footer(); ?>
