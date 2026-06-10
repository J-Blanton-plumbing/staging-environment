<?php
/**
 * ACF Local Field Groups for JB Blanton theme
 * Registered programmatically so no DB import is needed.
 */
if ( ! function_exists( 'acf_add_local_field_group' ) ) {
	return;
}

// ─── Group 1: City Page ───────────────────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_city_page',
	'title'    => 'City Page',
	'fields'   => [
		[ 'key' => 'field_city_h1_override',       'label' => 'H1 Override',            'name' => 'h1_override',           'type' => 'text',
		  'instructions' => 'Override the default "{City} Plumber" H1. Leave blank to use default.' ],
		[ 'key' => 'field_city_name',              'label' => 'City Name',              'name' => 'city_name',              'type' => 'text' ],
		[ 'key' => 'field_city_gbp',               'label' => 'GBP Location Name',      'name' => 'gbp',                   'type' => 'text' ],
		[ 'key' => 'field_city_address',           'label' => 'Address',                'name' => 'city_address',          'type' => 'text' ],
		[ 'key' => 'field_city_map_query',         'label' => 'Google Maps URL',        'name' => 'city_map_query',        'type' => 'url' ],
		[ 'key' => 'field_city_hero_image',        'label' => 'Hero Image',             'name' => 'hero_image',            'type' => 'text',
		  'instructions' => 'Filename without extension (e.g. "algonquin_hero"), full URL, or "vid_XXX" for video fallback.' ],
		[ 'key' => 'field_city_category_image',    'label' => 'Category Image',         'name' => 'category_image',        'type' => 'text' ],
		[ 'key' => 'field_city_elfsight_id',       'label' => 'Elfsight Reviews ID',    'name' => 'elfsight_reviews_id',   'type' => 'text',
		  'instructions' => 'Override auto-mapped Elfsight app UUID if needed.' ],
		[ 'key' => 'field_city_callout',           'label' => 'Callout Text',           'name' => 'city_callout',          'type' => 'text' ],
		[ 'key' => 'field_city_content',           'label' => 'City Content',           'name' => 'city_content',          'type' => 'wysiwyg',
		  'tabs' => 'all', 'toolbar' => 'full', 'media_upload' => 1 ],
		[ 'key' => 'field_city_page_title_seo',    'label' => 'Page Title (SEO)',        'name' => 'page_title_seo',        'type' => 'text' ],
		[ 'key' => 'field_city_meta_description',  'label' => 'Meta Description',       'name' => 'meta_description',      'type' => 'textarea', 'rows' => 3 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-city.php' ] ] ],
	'active'   => true,
] );

// ─── Group 2: City + Service Page ────────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_city_service_page',
	'title'    => 'City + Service Page',
	'fields'   => [
		[ 'key' => 'field_cs_service_header',      'label' => 'Service H1',             'name' => 'service_header',        'type' => 'text' ],
		[ 'key' => 'field_cs_service_header2',     'label' => 'Service H2',             'name' => 'service_header2',       'type' => 'text' ],
		[ 'key' => 'field_cs_service_callout',     'label' => 'Callout Text',           'name' => 'service_callout',       'type' => 'text' ],
		[ 'key' => 'field_cs_service_hero_image',  'label' => 'Hero Image',             'name' => 'service_hero_image',    'type' => 'text',
		  'instructions' => 'Same format as city hero_image.' ],
		[ 'key' => 'field_cs_service_content',     'label' => 'Service Content',        'name' => 'service_content',       'type' => 'wysiwyg',
		  'tabs' => 'all', 'toolbar' => 'full', 'media_upload' => 1 ],
		[ 'key' => 'field_cs_page_title_seo',      'label' => 'Page Title (SEO)',        'name' => 'page_title_seo',        'type' => 'text' ],
		[ 'key' => 'field_cs_meta_description',    'label' => 'Meta Description',       'name' => 'meta_description',      'type' => 'textarea', 'rows' => 3 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-city-service.php' ] ] ],
	'active'   => true,
] );

// ─── Group 3: Service Category Page ──────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_service_category_page',
	'title'    => 'Service Category Page',
	'fields'   => [
		[ 'key' => 'field_sc_h1_tag',              'label' => 'H1 Tag',                 'name' => 'h1_tag',                'type' => 'text' ],
		[ 'key' => 'field_sc_headline',            'label' => 'Hero Headline',          'name' => 'headline',              'type' => 'text' ],
		[ 'key' => 'field_sc_hero_image',          'label' => 'Hero Image',             'name' => 'hero_image',            'type' => 'text' ],
		[ 'key' => 'field_sc_h2_tag',              'label' => 'H2 Tag',                 'name' => 'h2_tag',                'type' => 'text' ],
		[ 'key' => 'field_sc_image2',              'label' => 'Section 2 Image',        'name' => 'image2',                'type' => 'text' ],
		[ 'key' => 'field_sc_headline2',           'label' => 'Section 2 Headline',     'name' => 'headline2',             'type' => 'text' ],
		[ 'key' => 'field_sc_benefits',            'label' => 'Benefits',               'name' => 'benefits',              'type' => 'wysiwyg',
		  'tabs' => 'all', 'toolbar' => 'full', 'media_upload' => 1 ],
		[ 'key' => 'field_sc_ndc_text',            'label' => 'NDC Text',               'name' => 'ndc_text',              'type' => 'wysiwyg',
		  'tabs' => 'all', 'toolbar' => 'full', 'media_upload' => 1 ],
		[ 'key' => 'field_sc_final_pitch_tagline', 'label' => 'Final Pitch Tagline',    'name' => 'final_pitch_tagline',   'type' => 'text' ],
		[ 'key' => 'field_sc_final_pitch_text',    'label' => 'Final Pitch Text',       'name' => 'final_pitch_text',      'type' => 'wysiwyg',
		  'tabs' => 'all', 'toolbar' => 'full', 'media_upload' => 1 ],
		[ 'key' => 'field_sc_page_title_seo',      'label' => 'Page Title (SEO)',        'name' => 'page_title_seo',        'type' => 'text' ],
		[ 'key' => 'field_sc_meta_description',    'label' => 'Meta Description',       'name' => 'meta_description',      'type' => 'textarea', 'rows' => 3 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-service.php' ] ] ],
	'active'   => true,
] );

// ─── Group 4: Static Page Hero (shared: front page + 12 static templates) ────
// Added 2026-04-20 — unlock hero banners for staff editing.
// Templates keep their original hardcoded strings as fallbacks, so empty
// fields render identically to before.
acf_add_local_field_group( [
	'key'      => 'group_static_page_hero',
	'title'    => 'Hero Banner',
	'fields'   => [
		[ 'key' => 'field_sph_hero_heading',       'label' => 'Hero Heading (H1)',      'name' => 'hero_heading',          'type' => 'text',
		  'instructions' => 'Main heading in the hero banner. Leave blank to keep the original wording.' ],
		[ 'key' => 'field_sph_hero_subheading',    'label' => 'Hero Sub-heading',       'name' => 'hero_subheading',       'type' => 'text',
		  'instructions' => 'Optional small line above the description. Leave blank to keep original or hide.' ],
		[ 'key' => 'field_sph_hero_description',   'label' => 'Hero Description',       'name' => 'hero_description',      'type' => 'textarea', 'rows' => 3,
		  'instructions' => 'Paragraph under the heading. Leave blank to keep original.' ],
		[ 'key' => 'field_sph_hero_image',         'label' => 'Hero Image',             'name' => 'hero_image_override',   'type' => 'text',
		  'instructions' => 'Filename without extension (becomes CloudFront URL), OR full URL. Leave blank to keep original image.' ],
	],
	'location' => [
		[ [ 'param' => 'page_type',     'operator' => '==', 'value' => 'front_page' ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-knowledge-hub.php'      ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-contact-us.php'         ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-customer-stories.php'   ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-emergency-plumbing.php' ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-financing.php'          ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-help-and-support.php'   ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-is-hiring.php'          ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-locations.php'          ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-no-drip-club.php'       ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-offers.php'             ] ],
		[ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-why-j-blanton.php'      ] ],
	],
	'active'   => true,
] );

// ─── Group 5: Homepage Body Sections (front page only) ───────────────────────
acf_add_local_field_group( [
	'key'      => 'group_static_page_home_body',
	'title'    => 'Homepage Body Sections',
	'fields'   => [
		[ 'key' => 'field_home_services_intro', 'label' => 'Services intro text',      'name' => 'home_services_intro', 'type' => 'textarea', 'rows' => 3,
		  'instructions' => 'Red "SERVICES" block intro. Leave blank to keep original.' ],
		[ 'key' => 'field_home_whyjb_text_1',   'label' => 'Why J. Blanton — text 1',  'name' => 'home_whyjb_text_1',   'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_home_whyjb_text_2',   'label' => 'Why J. Blanton — text 2',  'name' => 'home_whyjb_text_2',   'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_home_ndc_text',       'label' => 'No Drip Club promo text',  'name' => 'home_ndc_text',       'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_home_kb_text',        'label' => 'Knowledge Hub promo text', 'name' => 'home_kb_text',        'type' => 'textarea', 'rows' => 3 ],
		[ 'key' => 'field_home_findus_text_1',  'label' => 'Find Us — line 1',         'name' => 'home_findus_text_1',  'type' => 'textarea', 'rows' => 2 ],
		[ 'key' => 'field_home_findus_text_2',  'label' => 'Find Us — line 2',         'name' => 'home_findus_text_2',  'type' => 'textarea', 'rows' => 2 ],
	],
	'location' => [ [ [ 'param' => 'page_type', 'operator' => '==', 'value' => 'front_page' ] ] ],
	'active'   => true,
] );

// ─── Group 6: Why J. Blanton Body ────────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_static_page_why_body',
	'title'    => 'Why J. Blanton — Body Sections',
	'fields'   => [
		[ 'key' => 'field_whyjb_about_heading',  'label' => 'About Us — heading',       'name' => 'whyjb_about_heading',  'type' => 'text' ],
		[ 'key' => 'field_whyjb_about_text',     'label' => 'About Us — text',          'name' => 'whyjb_about_text',     'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_whyjb_expect_heading', 'label' => 'What to Expect — heading', 'name' => 'whyjb_expect_heading', 'type' => 'text' ],
		[ 'key' => 'field_whyjb_expect_text',    'label' => 'What to Expect — text',    'name' => 'whyjb_expect_text',    'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_whyjb_team_heading',   'label' => 'Meet Our Team — heading',  'name' => 'whyjb_team_heading',   'type' => 'text' ],
		[ 'key' => 'field_whyjb_team_text',      'label' => 'Meet Our Team — text',     'name' => 'whyjb_team_text',      'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_whyjb_loc_heading',    'label' => 'Our Locations — heading',  'name' => 'whyjb_loc_heading',    'type' => 'text' ],
		[ 'key' => 'field_whyjb_loc_text',       'label' => 'Our Locations — text',     'name' => 'whyjb_loc_text',       'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_whyjb_join_heading',   'label' => 'Join Our Team — heading',  'name' => 'whyjb_join_heading',   'type' => 'text' ],
		[ 'key' => 'field_whyjb_join_text',      'label' => 'Join Our Team — text',     'name' => 'whyjb_join_text',      'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-why-j-blanton.php' ] ] ],
	'active'   => true,
] );

// ─── Group 7: No Drip Club Body ──────────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_static_page_ndc_body',
	'title'    => 'No Drip Club — Body Sections',
	'fields'   => [
		[ 'key' => 'field_ndc_how_heading',     'label' => 'How It Works — heading',   'name' => 'ndc_how_heading',     'type' => 'text' ],
		[ 'key' => 'field_ndc_how_step1_label', 'label' => 'Step 1 label',              'name' => 'ndc_how_step1_label', 'type' => 'text' ],
		[ 'key' => 'field_ndc_how_step1_text',  'label' => 'Step 1 text',               'name' => 'ndc_how_step1_text',  'type' => 'textarea', 'rows' => 2 ],
		[ 'key' => 'field_ndc_how_step2_label', 'label' => 'Step 2 label',              'name' => 'ndc_how_step2_label', 'type' => 'text' ],
		[ 'key' => 'field_ndc_how_step2_text',  'label' => 'Step 2 text',               'name' => 'ndc_how_step2_text',  'type' => 'textarea', 'rows' => 2 ],
		[ 'key' => 'field_ndc_how_step3_label', 'label' => 'Step 3 label',              'name' => 'ndc_how_step3_label', 'type' => 'text' ],
		[ 'key' => 'field_ndc_how_step3_text',  'label' => 'Step 3 text',               'name' => 'ndc_how_step3_text',  'type' => 'textarea', 'rows' => 2 ],
		[ 'key' => 'field_ndc_wait_heading',    'label' => 'Closing CTA — heading',    'name' => 'ndc_wait_heading',    'type' => 'text' ],
		[ 'key' => 'field_ndc_wait_text',       'label' => 'Closing CTA — text',       'name' => 'ndc_wait_text',       'type' => 'textarea', 'rows' => 2 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-no-drip-club.php' ] ] ],
	'active'   => true,
] );

// ─── Group 8: Emergency Plumbing Body ────────────────────────────────────────
acf_add_local_field_group( [
	'key'      => 'group_static_page_ep_body',
	'title'    => 'Emergency Plumbing — Body Sections',
	'fields'   => [
		[ 'key' => 'field_ep_ready_heading',   'label' => 'Plumbers at the Ready — heading', 'name' => 'ep_ready_heading',   'type' => 'text' ],
		[ 'key' => 'field_ep_ready_text',      'label' => 'Plumbers at the Ready — text',    'name' => 'ep_ready_text',      'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_ep_cover_heading',   'label' => 'Coverage — heading',              'name' => 'ep_cover_heading',   'type' => 'text' ],
		[ 'key' => 'field_ep_cover_text',      'label' => 'Coverage — text',                 'name' => 'ep_cover_text',      'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_ep_ndccta_heading',  'label' => 'We Hate Emergencies — heading',   'name' => 'ep_ndccta_heading',  'type' => 'text' ],
		[ 'key' => 'field_ep_ndccta_text',     'label' => 'We Hate Emergencies — text',      'name' => 'ep_ndccta_text',     'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
		[ 'key' => 'field_ep_final_heading',   'label' => 'Good Call — heading',             'name' => 'ep_final_heading',   'type' => 'text' ],
		[ 'key' => 'field_ep_final_text',      'label' => 'Good Call — text',                'name' => 'ep_final_text',      'type' => 'wysiwyg', 'toolbar' => 'basic', 'media_upload' => 0 ],
	],
	'location' => [ [ [ 'param' => 'page_template', 'operator' => '==', 'value' => 'page-emergency-plumbing.php' ] ] ],
	'active'   => true,
] );
