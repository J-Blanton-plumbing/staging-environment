<?php get_header(); ?>

<?php if (have_posts()) : while (have_posts()) : the_post(); ?>

<?php
// Determine H1: city pages use "{Geo} Plumber", others use page title
$jb_geo    = get_post_meta(get_the_ID(), '_jb_geo', true);
$jb_h1_tag = get_post_meta(get_the_ID(), '_jb_h1_tag', true); // populated by plugin in Phase 1
if ($jb_h1_tag) {
	$h1 = $jb_h1_tag;
} elseif ($jb_geo) {
	$h1 = esc_html($jb_geo) . ' Plumber';
} else {
	$h1 = get_the_title();
}
?>

<div class="page-hero hero">
	<div class="hero-contents w81">
		<h1><?php echo esc_html($h1); ?></h1>
	</div>
</div>

<div class="hero-nav">
	<a href="<?php echo esc_url(home_url('/emergency-plumbing')); ?>">EMERGENCY PLUMBING</a>
	<a href="<?php echo esc_url(home_url('/knowledge-hub')); ?>">KNOWLEDGE HUB</a>
	<a href="<?php echo esc_url(home_url('/financing')); ?>">FINANCING</a>
	<a href="<?php echo esc_url(home_url('/help-and-support')); ?>">HELP &amp; SUPPORT</a>
</div>

<div class="cream">
	<div class="w81 emergecy-plumbing">
		<div class="page-content">
			<?php the_content(); ?>
		</div>

		<?php
		// If this is a city overview page, show child service pages
		$children = get_pages(['parent' => get_the_ID(), 'post_status' => 'publish', 'number' => 20]);
		if (!empty($children)) :
		?>
		<div class="city-services-list">
			<p class="red-text">Services in <?php echo esc_html($jb_geo ?: get_the_title()); ?></p>
			<div class="services-contents">
				<?php foreach ($children as $child) : ?>
				<div class="image-card">
					<div class="image-card-content">
						<p class="service-label"><?php echo esc_html($child->post_title); ?></p>
						<a href="<?php echo esc_url(get_permalink($child->ID)); ?>">
							<p>View Service</p>
							<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
						</a>
					</div>
				</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php endif; ?>
	</div>
</div>

<div class="cream-bottom w81">
	<div class="involveme_popup link-button"
		data-project="schedule-service-new"
		data-embed-mode="popup"
		data-trigger-event="button"
		data-popup-size="medium"
		data-organization-url="https://jblantonplumbing.involve.me"
		style="display:inline-flex;margin:40px 0;"
	><p>SCHEDULE A SERVICE</p></div>
</div>

<?php endwhile; endif; ?>

<?php get_footer(); ?>
