<template>
<div class="modules-page-container">
    <div v-if="allow_user" class="modules-and-details">

        <div class="modules-list-container">
            <module-detail v-if="this.route && modules_list.map(m => m.module_name).includes(route[1])" :module_name="route[1]" :sections="current_module_sections"></module-detail>
        </div>

        <div class="details-container">
            <div>
                <div v-for="(url, index) in this.chart" :key="index" class="chart-container">
                    <iframe width="100%" height="100%" frameborder="0" allowfullscreen :src="redirect_chart_url(superset_ip_address, url, filter)"></iframe>
                </div>

            </div>

        </div>
    </div>
    <div v-else class="">

        <div class="">
            <module-detail v-if="this.route && modules_list.map(m => m.module_name).includes(route[1])" :module_name="route[1]" :sections="current_module_sections"></module-detail>
        </div>

    </div>
</div>
</template>

<script>
import ModuleDetail from './ModuleDetail.vue';
import {
    generate_route
} from './utils.js';

export default {
    components: {
        ModuleDetail,
    },
    data() {
        return {
            route: frappe.get_route(),
            current_module_label: '',
            current_module_sections: [],
            modules_data_cache: {},
            modules_list: frappe.boot.allowed_modules.filter(
                (d) => (d.type === 'module' || d.category === 'Places') && !d.blocked
            ),
        };
    },
    created() {
        this.update_current_module();
    },
    mounted() {
        frappe.module_links = {};
        frappe.route.on('change', () => {
            this.update_current_module();
        });
    },
    methods: {
        update_current_module() {
            let route = frappe.get_route();
            if (route[0] === 'modules') {
                this.route = route;
                let module = this.modules_list.filter((m) => m.module_name === route[1])[0];
                let module_name = module && (module.label || module.module_name);
                let title = this.current_module_label ? this.current_module_label : module_name;

                frappe.modules.home && frappe.modules.home.page.set_title(title);

                if (!frappe.modules.home) {
                    setTimeout(() => {
                        frappe.modules.home.page.set_title(titkhile);
                    }, 200);
                }

                if (module_name) {
                    this.get_module_sections(module.module_name);
                }
            }
        },

        get_module_sections(module_name) {
            let cache = this.modules_data_cache[module_name];
            if (cache) {
                this.current_module_sections = cache;
            } else {
                this.current_module_sections = [];
                return frappe.call({
                    method: 'frappe.desk.moduleview.get',
                    args: {
                        module: module_name,
                    },
                    callback: (r) => {
                        this.chart = r.message.chart['chart_urls'];
                        this.superset_ip_address = r.message.chart['superset_ip_address'];
                        this.superset_api = r.message.chart['superset_api'];
                        this.filter = r.message.chart["filter"];
                        this.allow_user = r.message.allow_user;
                        this.current_module_sections = r.message.data;
                        this.process_data(module_name, this.current_module_sections);
                        this.modules_data_cache[module_name] = this.current_module_sections;
                    },
                    freeze: true,
                })
            }
        },
        redirect_chart_url(superset_ip_address, url, filter) {
            if (frappe.session.user == "Administrator") {
                return `${superset_ip_address}${url}`
            } else {
                return `${superset_ip_address}${url}&native_filters_key=${filter}`
            }
        },
        process_data(module_name, data) {
            frappe.module_links[module_name] = []
            data.forEach(function (section) {
                section.items.forEach(function (item) {
                    item.route = generate_route(item)
                })
            })
        },
    }
}
</script>

<style lang="less" scoped>
.modules-page-container {
    margin: 15px 0;
}

.modules-and-details {
    display: flex;
    justify-content: space-between;
}

.modules-list-container {
    width: 40%;
    padding-right: 20px;
}

.details-container {
    width: 60%;
    padding-left: 20px;
    height: auto;
}

.section-detail {
    padding: 10px 20px;
    border-radius: 4px;
    margin-bottom: 15px;
    border: 1px solid #ddd;
}

.skeleton-loader {
    background-color: #f5f7fa;
    height: 250px;
    border-radius: 4px;
    margin-bottom: 15px;
}

h4 {
    margin-bottom: 15px;
}

.superset-iframe {
    max-width: 100%;
    height: 100%;
    display: block;
}

.chart-container {
    max-width: 100%;
    height: 1200px;
    margin-bottom: 20px;
}
</style>
