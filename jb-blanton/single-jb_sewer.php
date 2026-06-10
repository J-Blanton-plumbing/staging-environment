<?php
/**
 * Single template for jb_sewer CPT.
 * URL: /sewer-service/{dsc}/
 */
get_header();

if ( have_posts() ) : while ( have_posts() ) : the_post();

$post_id  = get_the_ID();
$geo      = get_post_meta( $post_id, '_jb_sewer_city', true );
$gbp      = get_post_meta( $post_id, '_jb_gbp', true );
$service  = get_post_meta( $post_id, '_jb_sewer_service', true );
$seo_t    = get_post_meta( $post_id, '_jb_seo_title', true );
$h1       = $service && $geo ? ucfirst( $service ) . ' in ' . $geo : get_the_title();

// Elfsight hero reviews by GBP
$elfsight_hero = [
	'Algonquin'       => '40f0bd27-b99c-4171-87b2-f600ef6d8210',
	'Arlington Heights' => 'ca133efa-2c1f-4f4b-8095-6c07545044c8',
	'Elgin'           => '395fbb1e-5f6b-4759-b2db-3d620c51e4e2',
	'Evanston'        => '978a5a86-73cd-41c5-8b3a-1cb716957341',
	'Hinsdale'        => '5ce3f59e-a315-4272-a1e9-12f6e0843e75',
	'McHenry'         => '55b5212b-bef7-488d-a0ce-0629fd1dfaa0',
	'Naperville'      => '8342aee5-5fc9-4945-a8fd-f5ed625a682e',
	'Northbrook'      => 'bef726a2-1770-4806-9892-b36e55593142',
	'Geneva'          => '5915094e-aea7-4fe6-ade1-2d32c34c0e6d',
];
$elfsight_id = $elfsight_hero[ $gbp ] ?? '266c99c1-530c-4f93-8046-bab90e4a05e5';

// Related sewer services in same geo
$related = get_posts( [
	'post_type'      => 'jb_sewer',
	'post_status'    => 'publish',
	'posts_per_page' => 6,
	'post__not_in'   => [ $post_id ],
	'meta_query'     => [ [ 'key' => '_jb_sewer_city', 'value' => $geo ] ],
] );
?>


<div class="city-page-hero">
	<img class="lazy city-page-image"
		data-src="https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp"
		alt="<?php echo esc_attr( $h1 ); ?>" />
	<div class="contents">
		<div class="w">
			<h1><?php echo esc_html( $h1 ); ?></h1>
			<div class="reviews">
				<div class="elfsight-app-<?php echo esc_attr( $elfsight_id ); ?>" data-elfsight-app-lazy></div>
			</div>
		</div>
	</div>
</div>

<div class="hero-nav">
	<a href="<?php echo esc_url( home_url( '/emergency-plumbing' ) ); ?>">EMERGENCY PLUMBING</a>
	<a href="<?php echo esc_url( home_url( '/knowledge-hub' ) ); ?>">KNOWLEDGE HUB</a>
	<a href="<?php echo esc_url( home_url( '/financing' ) ); ?>">FINANCING</a>
	<a href="<?php echo esc_url( home_url( '/help-and-support' ) ); ?>">HELP &amp; SUPPORT</a>
</div>

<div class="cream">
	<div class="city-page-content">

		<?php if ( $seo_t ) : ?>
		<p class="red-text"><?php echo esc_html( $seo_t ); ?></p>
		<?php endif; ?>

		<div class="page-content service-body">
			<?php the_content(); ?>
		</div>

		<?php if ( ! empty( $related ) ) : ?>
		<div class="services-menu" style="margin-top:40px;">
			<p class="red-text2">MORE SEWER SERVICES IN <?php echo esc_html( strtoupper( $geo ) ); ?></p>
			<div class="city-services-list">
				<div class="services-contents">
					<?php foreach ( $related as $rel ) :
						$rel_service = get_post_meta( $rel->ID, '_jb_sewer_service', true );
					?>
					<div class="image-card">
						<div class="image-card-content">
							<p class="service-label"><?php echo esc_html( ucfirst( $rel_service ?: $rel->post_title ) ); ?></p>
							<a href="<?php echo esc_url( get_permalink( $rel->ID ) ); ?>">
								<p>View Service</p>
								<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16"><path fill="currentColor" fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/></svg>
							</a>
						</div>
					</div>
					<?php endforeach; ?>
				</div>
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
