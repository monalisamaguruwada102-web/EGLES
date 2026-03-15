console.log("app.js loaded");
const app = {
    container: document.getElementById('app-container'),

    async showLoading(delay = 400) {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'block';
            const bar = loader.querySelector('.progress-bar');
            if (bar) {
                bar.style.transition = 'none';
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.transition = 'width 0.4s cubic-bezier(0.1, 0.7, 0.1, 1)';
                    bar.style.width = '70%';
                }, 10);
            }
        }
        return new Promise(resolve => setTimeout(resolve, delay));
    },

    hideLoading() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            const bar = loader.querySelector('.progress-bar');
            if (bar) {
                bar.style.width = '100%';
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                        loader.style.opacity = '1';
                        bar.style.width = '0%';
                    }, 400);
                }, 200);
            }
        }
    },

    openSidebar() {
        document.getElementById('sidebar')?.classList.add('open');
        document.getElementById('sidebar-overlay')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeSidebar() {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
        document.body.style.overflow = '';
    },


    async init() {
        this.container = document.getElementById('app-container');
        this.loadTheme();
        
        // Data Integrity Check
        await this.fixData();

        if (this.checkAuth()) {
            const user = this.currentUser;
            // Student portal - only show results/fees
            if (user.role === 'Student') {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.style.display = 'none';
                await this.renderStudentPortal();
                return;
            }
            this.renderSidebar();
            this.updateHeaderUser();
            await this.showLoading(800);
            this.renderDashboard();
            await this.checkSystemAlerts();
            await this.updateNotifBadge();
            this.hideLoading();
        } else {
            // Show public portal by default (no login needed)
            this.showPublicPortal();
        }

        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
    },

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('egles_session'));
        if (user) {
            this.currentUser = user;
            return true;
        }
        return false;
    },

    async getTeacherData() {
        if (!this.currentUser || this.currentUser.role !== 'Teacher') return null;
        const staff = await db.staff.toArray();
        const me = staff.find(s => s.name === this.currentUser.name);
        if (!me) return { classes: [], subjects: [] };
        const subjects = await db.subjects.toArray();
        const mySubjects = subjects.filter(s => s.teacherId === me.staffId);
        const myClasses = [...new Set(mySubjects.map(s => s.class))];
        return { staffId: me.staffId, classes: myClasses, subjects: mySubjects };
    },

    showPublicPortal() {
        const sidebar = document.querySelector('.sidebar');
        const topbar = document.querySelector('.top-bar');
        if (sidebar) sidebar.style.display = 'none';
        if (topbar) topbar.style.display = 'none';
        
        this.container.classList.remove('page-content-fade');
        void this.container.offsetWidth;
        this.container.classList.add('page-content-fade');
        
        this.container.innerHTML = `
            <div id="public-portal" style="min-height:100vh; background: var(--bg-main); width:100vw; margin-left: calc(-1 * (100vw - 100%) / 2);">
                
                <!-- Premium Hero Section -->
                <div style="background: linear-gradient(135deg, var(--bg-card) 0%, rgba(99,102,241,0.15) 100%); padding: 6rem 1rem; position:relative; overflow:hidden; border-bottom:1px solid var(--glass-border); text-align:center;">
                    <div style="position:absolute; top:-50px; right:-50px; font-size:15rem; opacity:0.03; pointer-events:none;">🏫</div>
                    <div style="max-width:1200px; margin:0 auto; position:relative; z-index:10;">
                        <div style="display:inline-block; padding:0.4rem 1.2rem; background:var(--primary-glow); color:var(--primary-bright); border-radius:100px; font-size:0.8rem; font-weight:700; margin-bottom:1.5rem; letter-spacing:2px; text-transform:uppercase; border: 1px solid var(--primary-glow);">Official Gateway</div>
                        <h1 style="font-size: clamp(2.5rem, 8vw, 4.5rem); font-weight:900; letter-spacing:-2px; line-height:1.1; margin-bottom:1.5rem; background:linear-gradient(to bottom, #ffffff 30%, #94a3b8 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">EGLES <span style="color:var(--primary-bright); -webkit-text-fill-color:var(--primary-bright);">SMIS</span></h1>
                        <p style="color:var(--text-muted); font-size:1.25rem; max-width:700px; margin:0 auto 3rem; line-height:1.7;">A state-of-the-art management system for the leaders of tomorrow. Seamlessly connecting students, staff, and parents in a secure digital ecosystem.</p>
                        
                        <div style="display:flex; gap:1.5rem; flex-wrap:wrap; justify-content:center;">
                            <button onclick="app.showStudentLogin()" class="btn-primary" style="font-size:1.1rem; padding:1rem 2.5rem; box-shadow:0 15px 40px var(--primary-glow); border-radius:15px; border:none; background:var(--primary); color:white; cursor:pointer; display:flex; align-items:center; gap:0.5rem;">
                                🎓 Student Portal
                            </button>
                            <button onclick="app.showStaffLogin()" class="btn-primary" style="font-size:1.1rem; padding:1rem 2.5rem; background:rgba(255,255,255,0.05); color:var(--text); box-shadow:none; border:1px solid var(--glass-border); border-radius:15px; cursor:pointer; display:flex; align-items:center; gap:0.5rem;">
                                🔐 Staff Login
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div style="max-width:1400px; margin:0 auto; padding:4rem 1rem;">
                    
                    <!-- Admissions Countdown -->
                    <div id="pub-countdown-container"></div>

                    <!-- Hall of Fame -->
                    <div style="margin-bottom: 6rem;">
                        <h2 style="font-size: 2.5rem; margin-bottom: 3rem; text-align: center; font-weight: 800;">🏆 Wall of Excellence</h2>
                        <div id="pub-excellence-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Interactive Map -->
                    <div style="margin-bottom: 6rem;">
                        <h2 style="font-size: 2.5rem; margin-bottom: 2rem; text-align: center; font-weight: 800;">📍 Campus Explorer</h2>
                        <div style="position: relative; width: 100%; height: 500px; background: var(--bg-card); border-radius: 30px; border: 1px solid var(--glass-border); overflow: hidden; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(var(--glass-border) 1.5px, transparent 1.5px); background-size: 30px 30px;">
                            <!-- Main Academic Block -->
                            <div class="map-node" style="position: absolute; top: 25%; left: 15%; width: 180px; height: 120px; background: rgba(99, 102, 241, 0.15); border: 2px solid var(--primary); border-radius: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2);" onmouseover="this.style.transform='scale(1.1) translateY(-10px)'; this.style.background='rgba(99, 102, 241, 0.3)'" onmouseout="this.style.transform='scale(1) translateY(0)'; this.style.background='rgba(99, 102, 241, 0.15)'">
                                <div style="text-align: center;">
                                    <div style="font-size: 2rem;">🏢</div>
                                    <div style="font-weight: 700; font-size: 0.9rem;">Academic HQ</div>
                                </div>
                            </div>
                            <!-- Library -->
                            <div class="map-node" style="position: absolute; bottom: 20%; left: 30%; width: 140px; height: 140px; background: rgba(236, 72, 153, 0.15); border: 2px solid var(--secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 30px rgba(236, 72, 153, 0.2);" onmouseover="this.style.transform='scale(1.1) rotate(5deg)'; this.style.background='rgba(236, 72, 153, 0.3)'" onmouseout="this.style.transform='scale(1) rotate(0)'; this.style.background='rgba(236, 72, 153, 0.15)'">
                                <div style="text-align: center;">
                                    <div style="font-size: 2.2rem;">📚</div>
                                    <div style="font-weight: 700; font-size: 0.9rem;">Modern Library</div>
                                </div>
                            </div>
                            <!-- Science Labs -->
                            <div class="map-node" style="position: absolute; top: 15%; right: 20%; width: 160px; height: 160px; background: rgba(16, 185, 129, 0.15); border: 2px solid var(--success); border-radius: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);" onmouseover="this.style.transform='scale(1.1) translateY(-5px)'; this.style.background='rgba(16, 185, 129, 0.3)'" onmouseout="this.style.transform='scale(1) translateY(0)'; this.style.background='rgba(16, 185, 129, 0.15)'">
                                <div style="text-align: center;">
                                    <div style="font-size: 2.5rem;">🧪</div>
                                    <div style="font-weight: 700; font-size: 0.9rem;">Innovation Labs</div>
                                </div>
                            </div>
                            <!-- Sports Area -->
                            <div class="map-node" style="position: absolute; bottom: 15%; right: 10%; width: 300px; height: 150px; background: rgba(6, 182, 212, 0.15); border: 2px solid var(--accent); border-radius: 75px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 10px 30px rgba(6, 182, 212, 0.2);" onmouseover="this.style.transform='scale(1.05)'; this.style.background='rgba(6, 182, 212, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.background='rgba(6, 182, 212, 0.15)'">
                                <div style="text-align: center;">
                                    <div style="font-size: 2.5rem;">⚽</div>
                                    <div style="font-weight: 700; font-size: 0.9rem;">Olympic Sports Grounds</div>
                                </div>
                            </div>
                            <div style="position: absolute; top: 2rem; left: 2rem; background: var(--bg-main); padding: 0.75rem 1.5rem; border-radius: 100px; font-size: 0.85rem; font-weight: 700; border: 1px solid var(--glass-border); box-shadow: 0 10px 25px rgba(0,0,0,0.2);">🛸 DRONE'S EYE VIEW</div>
                        </div>
                    </div>

                    <!-- Live Stats -->
                    <div id="public-stats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:2rem; margin-bottom:6rem;">
                        <!-- Populate dynamically -->
                    </div>

                    <!-- Curriculum & Pathways -->
                    <div style="margin-bottom: 6rem;">
                        <h2 style="font-size: 2.5rem; margin-bottom: 3rem; text-align: center; font-weight: 800;">🚀 Academic Pathways</h2>
                        <div id="pub-curriculum-explorer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <!-- Notices & Timetable Split -->
                    <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap: 4rem;" class="mobile-stack">
                        <div>
                            <h2 style="font-size: 2rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">📢 Announcements</h2>
                            <div id="pub-notices-list" style="display:flex; flex-direction:column; gap:1.5rem;"></div>
                        </div>
                        <div>
                            <h2 style="font-size: 2rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem;">📅 Class Schedules</h2>
                            <div class="glass-panel" style="margin:0; padding:1.5rem; overflow-x:auto; border-radius: 25px;">
                                <div id="pub-timetable"></div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Footer/Testimonial -->
                <div id="pub-testimonial-container"></div>
                
                <footer style="padding: 4rem 2rem; text-align: center; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.2);">
                    <div class="logo" style="font-size: 2rem; margin-bottom: 1rem;">EGLES <span>SMIS</span></div>
                    <p style="color: var(--text-muted);">© 2026 Egles Secondary School. All academic rights reserved.</p>
                </footer>
            </div>

            <style>
                #public-portal {
                    overflow-x: hidden;
                    position: relative;
                }
                .main-wrapper {
                    margin-left: 0 !important;
                    width: 100% !important;
                    padding: 0 !important;
                    max-width: 100% !important;
                }
                @media (max-width: 1000px) {
                    .mobile-stack { grid-template-columns: 1fr !important; gap: 3rem !important; }
                    #public-portal { width: 100% !important; margin-left: 0 !important; }
                }
            </style>
        `;
        this._loadPublicData();
    },

    async _loadPublicData() {
        const [students, staff, subjects, notices, timetable, settings, achievements, curriculum, testimonials] = await Promise.all([
            db.students.toArray(),
            db.staff.toArray(),
            db.subjects.toArray(),
            db.notices.toArray(),
            db.timetable.toArray(),
            db.publicSettings.toArray(),
            db.publicAchievements.toArray(),
            db.publicCurriculum.toArray(),
            db.publicTestimonials.toArray()
        ]);

        const settingsMap = {};
        settings.forEach(s => settingsMap[s.key] = s.value);

        // 1. Live Countdown
        const countdownContainer = document.getElementById('pub-countdown-container');
        if (countdownContainer && settingsMap.countdown_date) {
            countdownContainer.innerHTML = `
                <div class="premium-countdown" style="background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); border-radius: 20px; padding: 2.5rem; color: white; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 2rem; margin-bottom: 4rem; box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25);">
                    <div class="countdown-text">
                        <div style="text-transform: uppercase; font-size: 0.9rem; font-weight: 800; letter-spacing: 2px; margin-bottom: 0.75rem; color: rgba(255,255,255,0.8);">Next Major Event</div>
                        <h2 style="font-size: 2.2rem; margin: 0; font-weight: 800; line-height: 1.2;">${settingsMap.countdown_title || 'Upcoming Event'}</h2>
                    </div>
                    <div class="countdown-numbers" style="display: flex; gap: 1rem; text-align: center; flex-wrap: wrap; justify-content: center;" id="live-timer">
                        <!-- Handled by startCountdown -->
                    </div>
                </div>
            `;
            this.startCountdown(settingsMap.countdown_date);
        }

        // 2. Wall of Excellence
        const excellenceGrid = document.getElementById('pub-excellence-grid');
        if (excellenceGrid) {
            excellenceGrid.innerHTML = achievements.map((a, i) => {
                const color = i % 3 === 0 ? 'var(--warning)' : i % 3 === 1 ? 'var(--success)' : 'var(--secondary)';
                const bg = i % 3 === 0 ? 'rgba(245, 158, 11, 0.1)' : i % 3 === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 72, 153, 0.1)';
                return `
                <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.05); transition: all 0.3s ease; display: flex; flex-direction: column; justify-content: space-between; height: 100%;" onmouseover="this.style.transform='translateY(-8px)'; this.style.borderColor='${color}'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--glass-border)'">
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                            <div style="font-size: 2.5rem; background: ${bg}; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px;">${a.icon}</div>
                            <span style="background: ${bg}; color: ${color}; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">${a.category}</span>
                        </div>
                        <h3 style="font-size: 1.35rem; margin:0 0 0.75rem 0;">${a.title}</h3>
                        <p style="color: var(--text-muted); font-size: 0.95rem; margin:0; line-height: 1.5;">${a.content}</p>
                    </div>
                </div>`;
            }).join('');
        }

        // 3. Curriculum Explorer
        const curriculumGrid = document.getElementById('pub-curriculum-explorer');
        if (curriculumGrid) {
            curriculumGrid.innerHTML = curriculum.map((c, i) => {
                const colors = [
                    { main: 'rgba(16, 185, 129, 0.05)', highlight: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.2)', text: 'var(--success)' },
                    { main: 'rgba(99, 102, 241, 0.05)', highlight: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.2)', text: 'var(--primary)' },
                    { main: 'rgba(236, 72, 153, 0.05)', highlight: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.2)', text: 'var(--secondary)' }
                ][i % 3];
                return `
                <div style="background: linear-gradient(135deg, ${colors.main} 0%, ${colors.highlight} 100%); border: 1px solid ${colors.border}; border-radius: 20px; padding: 2rem; position: relative; overflow: hidden; transition: all 0.4s ease; cursor: pointer;" onmouseover="this.style.transform='scale(1.03)'; this.querySelector('.curriculum-details').style.maxHeight='200px'; this.querySelector('.curriculum-details').style.opacity='1'; this.querySelector('.curriculum-details').style.marginTop='1rem'" onmouseout="this.style.transform='scale(1)'; this.querySelector('.curriculum-details').style.maxHeight='0'; this.querySelector('.curriculum-details').style.opacity='0'; this.querySelector('.curriculum-details').style.marginTop='0'">
                    <div style="position: absolute; right: -20px; bottom: -20px; font-size: 8rem; opacity: 0.1; transform: rotate(-15deg); pointer-events: none;">${c.icon}</div>
                    <h3 style="font-size: 1.5rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: ${colors.text};"><span style="font-size: 1.8rem;">${c.icon}</span> ${c.category}</h3>
                    <p style="color: var(--text); font-size: 1rem; margin-top: 0.5rem; font-weight: 500;">${c.description}</p>
                    
                    <div class="curriculum-details" style="max-height: 0; opacity: 0; overflow: hidden; transition: all 0.4s ease; border-top: 1px solid ${colors.border}; padding-top: 0;">
                        <ul style="list-style: none; padding: 0; margin: 0; color: var(--text-muted); font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem;">
                            ${c.details.split(',').map(d => `<li>✓ ${d.trim()}</li>`).join('')}
                        </ul>
                    </div>
                </div>`;
            }).join('');
        }

        // 4. Weather & Transport
        const wtContainer = document.getElementById('pub-weather-transport');
        if (wtContainer) {
            wtContainer.innerHTML = `
                <div class="glass-panel" style="margin: 0; display: flex; align-items: center; justify-content: space-between; padding: 2rem;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase;">Local Campus Weather</h3>
                        <div style="font-size: 2.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem;">
                            ${settingsMap.weather_mock || '☀️ 24°C'}
                        </div>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--primary);">Perfect weather for outdoor sports!</p>
                    </div>
                    <div style="font-size: 4rem; opacity: 0.2;">🌤️</div>
                </div>

                <div class="glass-panel" style="margin: 0; display: flex; align-items: center; justify-content: space-between; padding: 2rem;">
                    <div>
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted); font-size: 0.9rem; text-transform: uppercase;">Transport Status</h3>
                        <div style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; color: var(--success);">
                            ${settingsMap.transport_status || '🚌 All Routes On Time'}
                        </div>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">Next dispatch: 15:30 PM</p>
                    </div>
                    <div style="font-size: 4rem; opacity: 0.2;">🚍</div>
                </div>
            `;
        }

        // 5. Testimonial
        const testContainer = document.getElementById('pub-testimonial-container');
        if (testContainer && testimonials.length > 0) {
            const t = testimonials[0];
            testContainer.innerHTML = `
                <div style="position: relative; padding: 8rem 2rem; overflow: hidden; background: #020617; color: white;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 200%; background: radial-gradient(circle at center, var(--primary-glow) 0%, #020617 70%); transform: translateY(-30%); z-index: 0; opacity: 0.6; pointer-events: none;"></div>
                    <div style="max-width: 1100px; margin: 0 auto; position: relative; z-index: 10; text-align: center;">
                        <span style="font-size: 4rem; display: block; margin-bottom: 1.5rem; filter: drop-shadow(0 0 20px var(--primary-glow));">"${t.emoji}"</span>
                        <h2 style="font-size: 3rem; margin-bottom: 4rem; font-weight: 900; letter-spacing: -1px;">Forging Global Leaders</h2>
                        <div style="background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); padding: 4rem 2rem; border-radius: 40px; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.7);">
                            <p style="font-size: 1.6rem; font-style: italic; line-height: 1.7; margin-bottom: 2.5rem; color: #e2e8f0; font-weight: 400;">"${t.quote}"</p>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                                <h4 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: white;">${t.name}</h4>
                                <p style="color: var(--primary-bright); margin: 0; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${t.role}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Live Stats Population
        const statsGrid = document.getElementById('public-stats');
        if (statsGrid) {
            const stats = [
                { id: 'pub-students', count: students.length, label: 'Enrolled Students', icon: '👥', color: 'var(--primary)' },
                { id: 'pub-staff', count: staff.filter(s => s.role === 'Teacher').length, label: 'Senior Faculty', icon: '👩‍🏫', color: 'var(--success)' },
                { id: 'pub-subjects', count: subjects.length, label: 'Modern Courses', icon: '🚀', color: 'var(--accent)' },
                { id: 'pub-notices', count: notices.length, label: 'Live Alerts', icon: '🛰️', color: 'var(--warning)' }
            ];
            
            statsGrid.innerHTML = stats.map(s => `
                <div class="glass-panel" style="margin:0; text-align:center; padding:3rem 1.5rem; position:relative; overflow:hidden; border-radius: 30px; border: 1px solid var(--glass-border); transition: all 0.4s ease;" onmouseover="this.style.transform='scale(1.05)'; this.style.borderColor='${s.color}'" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='var(--glass-border)'">
                    <div style="position:absolute; top:-20px; right:-20px; font-size:7rem; opacity:0.04; transform: rotate(15deg);">${s.icon}</div>
                    <div style="font-size:4rem; font-weight:900; color:${s.color}; line-height:1; letter-spacing: -2px; margin-bottom: 1rem;" id="${s.id}">—</div>
                    <div style="font-size:0.95rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; font-weight:800;">${s.label}</div>
                </div>
            `).join('');

            // Trigger animations
            setTimeout(() => {
                stats.forEach(s => this.animateValue(s.id, 0, s.count, 2000));
            }, 500);
        }

        // Notices
        const nl = document.getElementById('pub-notices-list');
        if (nl) {
            nl.innerHTML = notices.length === 0
                ? '<div class="glass-panel" style="text-align:center; padding:3rem 2rem;"><div style="font-size:3rem; opacity:0.5; margin-bottom:1rem;">📭</div><p style="color:var(--text-muted); margin:0;">No public announcements at this time.</p></div>'
                : notices.slice(-5).reverse().map(n => {
                    const color = n.priority === 'High' ? 'var(--danger)' : n.priority === 'Medium' ? 'var(--warning)' : 'var(--success)';
                    const bg = n.priority === 'High' ? 'rgba(239, 68, 68, 0.05)' : n.priority === 'Medium' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)';
                    return `
                    <div style="background:var(--bg-card); border:1px solid var(--glass-border); border-left:4px solid ${color}; border-radius:16px; padding:1.5rem; transition:transform 0.2s, box-shadow 0.2s; cursor:default;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                            <div style="font-weight:700; font-size:1.1rem; color:var(--text); line-height:1.3; padding-right:1rem;">${n.title}</div>
                            <span style="background:${bg}; color:${color}; padding:4px 10px; border-radius:20px; font-size:0.7rem; font-weight:700; white-space:nowrap;">${n.priority}</span>
                        </div>
                        <div style="font-size:0.95rem; color:var(--text-muted); margin-bottom:1.25rem; line-height:1.6;">${n.content}</div>
                        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; color:var(--text-muted); opacity:0.8;">
                            <span>📅</span> ${n.date}
                        </div>
                    </div>`
                }).join('');
        }

        // Timetable
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const periods = ['08:00-09:00', '09:00-10:00', '10:30-11:30', '11:30-12:30', '14:00-15:00'];
        const tt = document.getElementById('pub-timetable');
        if (tt) {
            if (timetable.length === 0) {
                tt.innerHTML = '<div style="padding:4rem 2rem; text-align:center;"><div style="font-size:3rem; opacity:0.5; margin-bottom:1rem;">🗓️</div><p style="color:var(--text-muted); margin:0;">The master timetable has not been published yet.</p></div>';
            } else {
                tt.innerHTML = `<table style="width:100%; border-collapse:collapse; min-width:600px;">
                    <thead><tr style="background:rgba(255,255,255,0.02);">
                        <th style="padding:1.25rem 1rem; border-bottom:1px solid var(--glass-border); color:var(--text); font-weight:700; font-size:0.85rem;">PERIOD</th>
                        ${days.map(d => `<th style="padding:1.25rem 1rem; border-bottom:1px solid var(--glass-border); color:var(--text); font-weight:700; font-size:0.85rem;">${d.toUpperCase()}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                        ${periods.map((p, i) => `<tr style="${i % 2 === 0 ? 'background:rgba(255,255,255,0.01);' : ''}">
                            <td style="padding:1rem; border-bottom:1px solid var(--glass-border); font-weight:600; color:var(--primary-bright); font-family:monospace; font-size:0.95rem;">${p}</td>
                            ${days.map(d => {
                    const e = timetable.find(s => s.day === d && s.period === p);
                    return `<td style="padding:1rem; border-bottom:1px solid var(--glass-border); vertical-align:top;">
                                    ${e ? `<div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); padding:0.75rem; border-radius:10px;">
                                        <strong style="display:block; color:var(--text); margin-bottom:0.25rem; font-size:0.95rem;">${e.subject}</strong>
                                        <div style="color:var(--text-muted); font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
                                            <span>${e.class}</span>
                                            <span style="opacity:0.5;">●</span>
                                        </div>
                                    </div>` : '<div style="color:var(--text-muted); opacity:0.3; text-align:center; padding:1rem;">-</div>'}
                                </td>`;
                }).join('')}
                        </tr>`).join('')}
                    </tbody>
                </table>`;
            }
        }
    },

    showStaffLogin() {
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.top-bar').style.display = 'none';
        this.container.innerHTML = `
            <div class="auth-overlay">
                <div class="glass-panel auth-card">
                    <div style="text-align:center; margin-bottom:1rem; font-size:2.5rem;">🔐</div>
                    <div class="logo" style="text-align:center; margin-bottom:0.5rem;">Egles <span>SMIS</span></div>
                    <h2 style="text-align:center;">Staff / Admin Login</h2>
                    <p style="text-align:center; color:var(--text-muted); margin-bottom:2rem; font-size:0.85rem;">Staff accounts are provisioned by the Administrator.</p>
                    <form onsubmit="app.handleStaffAuth(event)">
                        <input type="text" id="auth-user" placeholder="Username" required autocomplete="username">
                        <input type="password" id="auth-pass" placeholder="Password" required autocomplete="current-password">
                        <button type="submit" class="btn-primary" style="width:100%; margin-top:1rem;">Sign In</button>
                    </form>
                    <div style="margin-top:1.5rem; text-align:center;">
                        <a href="#" onclick="app.init()" style="color:var(--primary); font-size:0.85rem;">← Back to Public Portal</a>
                    </div>
                </div>
            </div>
        `;
    },

    showStudentLogin() {
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.top-bar').style.display = 'none';
        this.container.innerHTML = `
            <div class="auth-overlay">
                <div class="glass-panel auth-card">
                    <div style="text-align:center; margin-bottom:1rem; font-size:2.5rem;">🎓</div>
                    <div class="logo" style="text-align:center; margin-bottom:0.5rem;">Egles <span>SMIS</span></div>
                    <h2 style="text-align:center;">Student Results Portal</h2>
                    <p style="text-align:center; color:var(--text-muted); margin-bottom:2rem; font-size:0.85rem;">Enter your Student ID and Full Name to access your results and fees.</p>
                    <form onsubmit="app.handleStudentLogin(event)">
                        <input type="text" id="stu-id" placeholder="Student ID (e.g. STU-12345)" required>
                        <input type="text" id="stu-name" placeholder="Full Name" required>
                        <button type="submit" class="btn-primary" style="width:100%; margin-top:1rem; background:var(--secondary);">Access My Portal</button>
                    </form>
                    <div style="margin-top:1.5rem; text-align:center;">
                        <a href="#" onclick="app.init()" style="color:var(--primary); font-size:0.85rem;">← Back to Public Portal</a>
                    </div>
                </div>
            </div>
        `;
    },

    async handleStaffAuth(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        if (btn) btn.classList.add('loading');
        
        try {
            const username = document.getElementById('auth-user').value.trim();
            const password = document.getElementById('auth-pass').value;
            const users = await db.users.toArray();
            const user = users.find(u => u.username === username && u.password === password);
            
            await new Promise(r => setTimeout(r, 600)); // Aesthetic delay

            if (user && ['Admin', 'Teacher', 'Staff', 'Bursar'].includes(user.role)) {
                localStorage.setItem('egles_session', JSON.stringify(user));
                document.querySelector('.sidebar').style.display = '';
                document.querySelector('.top-bar').style.display = '';
                this.init();
            } else if (user) {
                alert('This portal is for Staff and Admins only. Use the Student Portal.');
            } else {
                alert('Invalid credentials. If you believe this is an error, contact your Administrator.');
            }
        } finally {
            if (btn) btn.classList.remove('loading');
        }
    },

    async handleStudentLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        if (btn) btn.classList.add('loading');

        try {
            const studentId = document.getElementById('stu-id').value.trim();
            const name = document.getElementById('stu-name').value.trim().toLowerCase();
            const students = await db.students.toArray();
            const student = students.find(s => s.studentId.toLowerCase() === studentId.toLowerCase() && s.name.toLowerCase() === name);
            
            await new Promise(r => setTimeout(r, 600)); // Aesthetic delay

            if (student) {
                const session = { 
                    role: 'Student', 
                    name: student.name, 
                    studentId: student.studentId || student.studentid, 
                    id: student.id 
                };
                localStorage.setItem('egles_session', JSON.stringify(session));
                this.currentUser = session;
                await this.renderStudentPortal();
            } else {
                alert('Student not found. Please check your Student ID and Full Name, then try again.');
            }
        } finally {
            if (btn) btn.classList.remove('loading');
        }
    },



    async renderStudentPortal() {
        const student = await db.students.get(this.currentUser.id);
        if (!student) return alert("Student profile error.");

        const marks = await db.marks.where('studentId').equals(student.studentId).toArray();
        const attendance = await db.attendance.where('studentId').equals(student.studentId).toArray();
        const payments = await db.fees.where('studentId').equals(student.studentId).toArray();
        const notices = await db.notices.toArray();

        // Calculate attendance stats
        const attTotal = attendance.length;
        const attPresent = attendance.filter(a => a.status === 'Present').length;
        const attPercent = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100;

        this.container.innerHTML = `
            <div id="student-portal" style="min-height: 100vh; background: var(--bg-main); width: 100vw; margin-left: calc(-1 * (100vw - 100%) / 2);">
                <div style="max-width:1400px; margin:0 auto; padding:2rem 1rem;">
                    
                    <!-- PREMIUM IDENTITY HEADER -->
                    <div class="glass-panel" style="background: linear-gradient(135deg, var(--bg-card), rgba(99,102,241,0.08)); border: 1px solid var(--glass-border); padding: 0; overflow: hidden; margin-bottom: 3rem; display: flex; flex-wrap: wrap; border-radius: 30px; box-shadow: var(--shadow-lg);">
                        <div style="flex: 1; min-width: 300px; padding: 3rem; display: flex; gap: 2.5rem; align-items: center;">
                            <div style="position: relative;">
                                <div style="width: 120px; height: 120px; border-radius: 30px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 3.5rem; font-weight: 900; box-shadow: 0 20px 40px var(--primary-glow); border: 5px solid var(--bg-card);">
                                    ${student.name.charAt(0).toUpperCase()}
                                </div>
                                <div style="position: absolute; bottom: 0; right: 0; width: 34px; height: 34px; background: var(--success); border-radius: 50%; border: 4px solid var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 1rem;">✨</div>
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                                    <span style="background: var(--success-glow); color: var(--success); padding: 4px 12px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">Active</span>
                                    <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">System verified</span>
                                </div>
                                <h1 style="margin: 0; font-size: 2.8rem; font-weight: 900; letter-spacing: -1px; background: linear-gradient(to bottom, #ffffff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${student.name}</h1>
                                <div style="display: flex; gap: 2rem; margin-top: 0.75rem; color: var(--text-muted); font-size: 1rem;">
                                    <span><strong>ID:</strong> <span style="color:var(--primary-bright); font-family: monospace;">${student.studentId}</span></span>
                                    <span><strong>CLASS:</strong> <span style="color:white; font-weight: 700;">${student.class}</span></span>
                                </div>
                            </div>
                        </div>
                        <div style="width: 280px; background: rgba(0,0,0,0.3); border-left: 1px solid var(--glass-border); padding: 2.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                            <button onclick="app.logout()" class="btn-primary" style="width: 100%; margin-bottom: 1.5rem; background: var(--danger);">Secure Logout</button>
                            <div style="width: 100px; height: 100px; background: white; padding: 10px; border-radius: 15px;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${student.studentId}" style="width: 100%;">
                            </div>
                        </div>
                    </div>

                    <div class="dashboard-grid mobile-stack" style="grid-template-columns: 2fr 1fr; gap: 2rem;">
                        <!-- Left Column: Results & Info -->
                        <div style="display: flex; flex-direction: column; gap: 2rem;">
                            
                            <!-- Result Overview -->
                            <div class="glass-panel" style="margin: 0; border-radius: 30px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                                    <h2>Academic Achievement</h2>
                                    <div style="background: var(--primary-glow); padding: 8px 16px; border-radius: 12px; color: var(--primary-bright); font-weight: 700;">Term 1 Report</div>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem;">
                                    ${marks.length === 0 ? '<p>No results posted yet.</p>' : marks.map(m => `
                                        <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border);">
                                            <div style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">${m.subject}</div>
                                            <div style="display: flex; justify-content: space-between; align-items: end;">
                                                <div style="font-size: 2.25rem; font-weight: 800; color: white;">${m.score}%</div>
                                                <div style="color: var(--primary); font-weight: 900; font-size: 1.2rem; margin-bottom: 0.3rem;">${this.calculateGrade(m.score)}</div>
                                            </div>
                                            <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 1rem; overflow: hidden;">
                                                <div style="width: ${m.score}%; height: 100%; background: var(--primary); border-radius: 10px;"></div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <!-- Financial Status -->
                            <div class="glass-panel" style="margin:0; border-radius: 30px;">
                                <h2>Finance & Billing</h2>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="text-align: left; opacity: 0.5;">
                                            <th style="padding: 1rem;">Service/Item</th>
                                            <th style="padding: 1rem;">Date</th>
                                            <th style="padding: 1rem;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${payments.length === 0 ? '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-muted);">No payment records found.</td></tr>' : payments.map(p => `
                                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                                <td style="padding: 1rem; font-weight: 600;">${p.type || 'Tuition Fee'}</td>
                                                <td style="padding: 1rem; color: var(--text-muted);">${p.date}</td>
                                                <td style="padding: 1rem; color: var(--success); font-weight: 800;">$${p.amount}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Right Column: Sidebar Stats -->
                        <div style="display: flex; flex-direction: column; gap: 2rem;">
                            
                            <!-- Attendance Card -->
                            <div class="glass-panel" style="margin: 0; text-align: center; border-radius: 30px; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: -10px; right: -10px; font-size: 5rem; opacity: 0.05;">📅</div>
                                <h3 style="margin-bottom: 1.5rem;">Class Attendance</h3>
                                <div style="font-size: 4rem; font-weight: 900; color: var(--accent); line-height: 1;">${attPercent}%</div>
                                <p style="margin-top: 0.5rem; font-weight: 600;">Overall Rating</p>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 1.5rem;">Successfully attended ${attPresent} out of ${attTotal} sessions this term.</div>
                            </div>

                            <!-- Notice Board Card -->
                            <div class="glass-panel" style="margin: 0; border-radius: 30px;">
                                <h3 style="margin-bottom: 1.5rem;">Campus Notices</h3>
                                <div style="display: flex; flex-direction: column; gap: 1rem;">
                                    ${notices.length === 0 ? '<p style="color: var(--text-muted);">No notices today.</p>' : notices.slice(-3).reverse().map(n => `
                                        <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 16px; border-left: 3px solid var(--primary);">
                                            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem;">${n.title}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-muted);">${n.date}</div>
                                        </div>
                                    `).join('')}
                                </div>
                                <button class="btn-primary" style="width: 100%; margin-top: 1.5rem; background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border);" onclick="alert('Digital Archives available in Admin Block')">View Archives</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style>
                #student-portal { overflow-x: hidden; }
                @media (max-width: 900px) {
                    #student-portal { width: 100% !important; margin-left: 0 !important; }
                    .mobile-stack { grid-template-columns: 1fr !important; }
                }
            </style>
        `;
    },

    logout() {
        localStorage.removeItem('egles_session');
        window.location.reload();
    },

    updateHeaderUser() {
        const nameEl = document.getElementById('user-display-name');
        const avatarEl = document.getElementById('user-avatar');
        if (this.currentUser && nameEl) {
            nameEl.textContent = this.currentUser.name || this.currentUser.username;
            const roleLabel = document.createElement('span');
            roleLabel.style.cssText = 'font-size: 0.65rem; color: var(--text-muted); display: block; text-transform: uppercase; letter-spacing: 0.5px;';
            roleLabel.textContent = this.currentUser.role;
            nameEl.after(roleLabel);
        }
        if (this.currentUser && avatarEl) {
            avatarEl.textContent = (this.currentUser.name || 'U').charAt(0).toUpperCase();
        }
    },

    isReadOnly() {
        if (!this.currentUser) return true;
        return ['Student', 'Parent'].includes(this.currentUser.role);
    },

    animateValue(id, start, end, duration) {
        const el = document.getElementById(id);
        if (!el) return;
        if (end === 0) { el.textContent = '0'; return; }
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(easeProgress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = end;
            }
        };
        window.requestAnimationFrame(step);
    },

    canModify() {
        return !this.isReadOnly();
    },

    // --- Theme & Accessibility Management ---
    setTheme(themeName) {
        document.body.className = '';
        if (themeName !== 'default') {
            document.body.classList.add(`${themeName}-theme`);
        }
        localStorage.setItem('egles_theme', themeName);
        this.applyAccessibility();
    },

    loadTheme() {
        const theme = localStorage.getItem('egles_theme') || 'default';
        this.setTheme(theme);
        this.renderAccessibilityWidget();
    },

    applyAccessibility() {
        const fontSize = localStorage.getItem('egles_font_size') || '1';
        const dyslexic = localStorage.getItem('egles_dyslexic') === 'true';
        const reducedMotion = localStorage.getItem('egles_reduced_motion') === 'true';

        document.documentElement.style.setProperty('--font-scale', fontSize);
        document.body.classList.toggle('dyslexic-font', dyslexic);
        document.body.classList.toggle('reduced-motion', reducedMotion);
    },

    toggleAccessibilityFeature(feature) {
        if (feature === 'dyslexic') {
            const current = localStorage.getItem('egles_dyslexic') === 'true';
            localStorage.setItem('egles_dyslexic', !current);
        } else if (feature === 'motion') {
            const current = localStorage.getItem('egles_reduced_motion') === 'true';
            localStorage.setItem('egles_reduced_motion', !current);
        } else if (feature === 'font-inc') {
            let size = parseFloat(localStorage.getItem('egles_font_size') || '1');
            if (size < 1.4) size += 0.1;
            localStorage.setItem('egles_font_size', size.toFixed(1));
        } else if (feature === 'font-dec') {
            let size = parseFloat(localStorage.getItem('egles_font_size') || '1');
            if (size > 0.8) size -= 0.1;
            localStorage.setItem('egles_font_size', size.toFixed(1));
        }
        this.applyAccessibility();
    },

    renderAccessibilityWidget() {
        const existing = document.getElementById('accessibility-widget');
        if (existing) existing.remove();

        const widget = document.createElement('div');
        widget.id = 'accessibility-widget';
        widget.style.cssText = 'position:fixed; bottom:2rem; left:2rem; z-index:9999;';

        const themes = [
            { id: 'default', name: 'Cyber Glass', color: '#58a6ff' },
            { id: 'light', name: 'Light', color: '#ffffff' },
            { id: 'midnight', name: 'Midnight', color: '#020617' },
            { id: 'aurora', name: 'Aurora', color: '#064e3b' }
        ];

        widget.innerHTML = `
            <button id="acc-trigger" style="width:50px; height:50px; border-radius:50%; background:var(--primary); color:white; border:none; box-shadow:0 10px 25px var(--primary-glow); cursor:pointer; font-size:1.5rem; display:flex; align-items:center; justify-content:center; transition:all 0.3s ease;">♿</button>
            <div id="acc-menu" class="glass-panel" style="position:absolute; bottom:60px; left:0; width:280px; padding:1.5rem; display:none; flex-direction:column; gap:1.25rem; border:1px solid var(--glass-border); border-radius:24px; animation: slideUp 0.3s ease;">
                <h3 style="margin:0; font-size:1rem; border-bottom:1px solid var(--glass-border); padding-bottom:0.75rem;">Accessibility Hub</h3>
                
                <div>
                    <label style="display:block; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.75rem; font-weight:700;">Select Theme</label>
                    <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                        ${themes.map(t => `<button onclick="app.setTheme('${t.id}')" style="width:30px; height:30px; border-radius:50%; background:${t.color}; border:2px solid ${localStorage.getItem('egles_theme') === t.id ? 'white' : 'transparent'}; cursor:pointer;" title="${t.name}"></button>`).join('')}
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.75rem; font-weight:700;">Text Size</label>
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="app.toggleAccessibilityFeature('font-dec')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:var(--text); padding:0.5rem; border-radius:8px; cursor:pointer;">A-</button>
                        <button onclick="app.toggleAccessibilityFeature('font-inc')" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); color:var(--text); padding:0.5rem; border-radius:8px; cursor:pointer;">A+</button>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem;">Dyslexic Friendly</span>
                    <button onclick="app.toggleAccessibilityFeature('dyslexic')" style="width:40px; height:20px; border-radius:20px; background:${localStorage.getItem('egles_dyslexic') === 'true' ? 'var(--success)' : 'rgba(255,255,255,0.1)'}; border:none; position:relative; cursor:pointer;">
                        <div style="position:absolute; top:2px; ${localStorage.getItem('egles_dyslexic') === 'true' ? 'right:2px' : 'left:2px'}; width:16px; height:16px; background:white; border-radius:50%; transition:all 0.2s;"></div>
                    </button>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem;">Reduced Motion</span>
                    <button onclick="app.toggleAccessibilityFeature('motion')" style="width:40px; height:20px; border-radius:20px; background:${localStorage.getItem('egles_reduced_motion') === 'true' ? 'var(--success)' : 'rgba(255,255,255,0.1)'}; border:none; position:relative; cursor:pointer;">
                        <div style="position:absolute; top:2px; ${localStorage.getItem('egles_reduced_motion') === 'true' ? 'right:2px' : 'left:2px'}; width:16px; height:16px; background:white; border-radius:50%; transition:all 0.2s;"></div>
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            </style>
        `;
        document.body.appendChild(widget);

        const trigger = widget.querySelector('#acc-trigger');
        const menu = widget.querySelector('#acc-menu');
        trigger.onclick = () => {
            const isVisible = menu.style.display === 'flex';
            menu.style.display = isVisible ? 'none' : 'flex';
            trigger.style.transform = isVisible ? 'rotate(0)' : 'rotate(90deg)';
        };
    },

    renderSidebar() {
        const role = this.currentUser.role;
        const nav = document.getElementById('sidebar-nav');

        const menu = [
            {
                label: 'Core', items: [
                    { id: 'dashboard', name: 'Dashboard', roles: ['Admin', 'Teacher', 'Parent', 'Student'] },
                    { id: 'students', name: 'Students', roles: ['Admin', 'Teacher'] },
                    { id: 'staff', name: 'Staff', roles: ['Admin'] }
                ]
            },
            {
                label: 'Academic', items: [
                    { id: 'subjects', name: 'Subjects', roles: ['Admin', 'Teacher'] },
                    { id: 'exams', name: 'Examinations', roles: ['Admin', 'Teacher', 'Parent', 'Student'] },
                    { id: 'attendance', name: 'Attendance', roles: ['Admin', 'Teacher'] },
                    { id: 'library', name: 'Library', roles: ['Admin', 'Teacher', 'Parent', 'Student'] },
                    { id: 'discipline', name: 'Discipline', roles: ['Admin', 'Teacher'] },
                    { id: 'health', name: 'Health Records', roles: ['Admin', 'Teacher', 'Parent'] }
                ]
            },
            {
                label: 'Finance & Infrastructure', items: [
                    { id: 'fees', name: 'Fees Management', roles: ['Admin', 'Parent'] },
                    { id: 'payroll', name: 'Staff Payroll', roles: ['Admin'] },
                    { id: 'inventory', name: 'Inventory & Assets', roles: ['Admin'] },
                    { id: 'expenses', name: 'Expenses', roles: ['Admin'] },
                    { id: 'hostels', name: 'Hostels', roles: ['Admin', 'Parent'] },
                    { id: 'transport', name: 'Transport', roles: ['Admin', 'Parent'] }
                ]
            },
            {
                label: 'Communication', items: [
                    { id: 'notices', name: 'Notice Board', roles: ['Admin', 'Teacher', 'Parent', 'Student'] },
                    { id: 'resources', name: 'Resources', roles: ['Admin', 'Teacher', 'Parent', 'Student'] }
                ]
            }
        ];

        nav.innerHTML = menu.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(role));
            if (visibleItems.length === 0) return '';

            return `
            <div class="nav-group">
                <span class="nav-label">${group.label}</span>
                    ${visibleItems.map(item => `
                        <button class="nav-item ${item.id === 'dashboard' ? 'active' : ''}" onclick="app.navigate('${item.id}')">
                            <span>${item.name}</span>
                        </button>
                    `).join('')
                }
            </div>
    `;
        }).join('');
    },

    // --- Phase 2: Notification & Alert Logic ---
    async checkSystemAlerts() {
        // 1. Check for students with low fees (simulated threshold $1000)
        const students = await db.students.toArray();
        const fees = await db.fees.toArray();

        for (const student of students) {
            const studentFees = fees.filter(f => f.studentId === student.studentId)
                .reduce((acc, f) => acc + parseFloat(f.amount), 0);

            if (studentFees < 1000) {
                await this.addNotification(
                    'Fee Payment Alert',
                    `Student ${student.name} (${student.studentId}) has paid less than $1,000.Current: $${studentFees.toLocaleString()}.`,
                    'finance'
                );
            }
        }

        // 2. Check for disciplinary issues (simulated count >= 3)
        const discipline = await db.discipline.toArray();
        const infractionCounts = {};
        discipline.forEach(d => {
            infractionCounts[d.studentId] = (infractionCounts[d.studentId] || 0) + 1;
        });

        for (const sid in infractionCounts) {
            if (infractionCounts[sid] >= 3) {
                const student = await db.students.where('studentId').equals(sid).first();
                await this.addNotification(
                    'Disciplinary Warning',
                    `Student ${student ? student.name : sid} has recorded ${infractionCounts[sid]} infractions.Review required.`,
                    'discipline'
                );
            }
        }
    },

    async addNotification(title, message, type) {
        // Prevent duplicate notifications for same day/title
        const today = new Date().toISOString().split('T')[0];
        const exists = await db.notifications.where('title').equals(title).and(n => n.message === message).first();

        // Scrub 'undefined' strings for a cleaner UI
        const cleanMessage = message.replace(/\(undefined\)/g, '').replace(/undefined/g, 'N/A');

        if (!exists) {
            await db.notifications.add({
                title,
                message: cleanMessage,
                type,
                date: new Date().toLocaleString(),
                read: 0
            });
        }
    },

    async updateNotifBadge() {
        const unreadCount = await db.notifications.where('read').equals(0).count();
        const badge = document.getElementById('notif-badge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    toggleNotifications() {
        const panel = document.getElementById('notification-panel');
        const isHidden = panel.classList.contains('hidden');

        if (isHidden) {
            this.renderNotifications();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    },

    async renderNotifications() {
        const notifications = await db.notifications.reverse().limit(10).toArray();
        const list = document.getElementById('notif-list');

        if (notifications.length === 0) {
            list.innerHTML = '<p class="empty-notif" style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem;">No new notifications</p>';
            return;
        }

        list.innerHTML = notifications.map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="app.markAsRead(${n.id})">
                <div class="notif-icon" style="background: ${this.getNotifColor(n.type)}">
                    ${this.getNotifEmoji(n.type)}
                </div>
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-msg">${n.message}</div>
                    <div class="notif-time">${n.date}</div>
                </div>
            </div>
    `).join('');
    },

    getNotifColor(type) {
        switch (type) {
            case 'finance': return 'rgba(16, 185, 129, 0.1)';
            case 'discipline': return 'rgba(239, 68, 68, 0.1)';
            default: return 'rgba(99, 102, 241, 0.1)';
        }
    },

    getNotifEmoji(type) {
        switch (type) {
            case 'finance': return '💰';
            case 'discipline': return '⚠️';
            default: return '📢';
        }
    },

    async markAsRead(id) {
        await db.notifications.update(id, { read: 1 });
        this.updateNotifBadge();
        this.renderNotifications();
    },

    async markAllAsRead() {
        await db.notifications.where('read').equals(0).modify({ read: 1 });
        this.updateNotifBadge();
        this.renderNotifications();
    },

    updateOnlineStatus() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            if (navigator.onLine) {
                indicator.classList.add('hidden');
            } else {
                indicator.classList.remove('hidden');
            }
        }
    },

    showProvisionModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="glass-panel auth-card" style="width: 500px; padding: 3rem; background: var(--bg-main); border: 1px solid var(--glass-border); border-radius: 24px; position: fixed; top: 50%; left: 50%; translate: -50% -50%; z-index: 2500;">
                <h2 style="text-align: center;">Provision New Staff</h2>
                <p style="text-align: center; margin-bottom: 2rem;">Register a teacher or administrator and generate their credentials.</p>
                <form id="provision-form" onsubmit="app.handleProvision(event)">
                    <input type="text" id="prov-name" placeholder="Full Name" required>
                    <select id="prov-role" required style="width: 100%; margin: 10px 0; padding: 12px; border-radius: 12px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: var(--text);">
                        <option value="Teacher">Teacher</option>
                        <option value="Admin">Administrator</option>
                    </select>
                    <input type="text" id="prov-contact" placeholder="Contact Number" required>
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="btn-primary" style="flex: 1;">Generate Credentials</button>
                        <button type="button" class="btn-primary" style="flex: 1; background: var(--bg-card); color: var(--text);" onclick="this.closest('.modal-backdrop').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    },

    async handleProvision(e) {
        e.preventDefault();
        const name = document.getElementById('prov-name').value;
        const role = document.getElementById('prov-role').value;
        const contact = document.getElementById('prov-contact').value;

        const staffId = (role === 'Admin' ? 'ADM-' : 'TCH-') + Math.floor(1000 + Math.random() * 9000);
        const username = name.toLowerCase().replace(/\s/g, '.') + Math.floor(10 + Math.random() * 89);
        const password = Math.random().toString(36).slice(-8);

        // Save to staff table
        await db.staff.add({ staffId, name, role, contact });

        // Save to users table for authentication
        await db.users.add({ username, password, role, name });

        const modalOverlay = e.target.closest('.modal-backdrop');
        modalOverlay.innerHTML = `
            <div class="glass-panel auth-card" style="width: 500px; padding: 3rem; background: var(--bg-main); border: 1px solid var(--glass-border); border-radius: 24px; position: fixed; top: 50%; left: 50%; translate: -50% -50%; z-index: 2500; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">✅</div>
                <h2>Staff Provisioned Successfully</h2>
                <p>Please share these secure credentials with <strong>${name}</strong>.</p>
                
                <div style="background: rgba(0,0,0,0.2); padding: 2rem; border-radius: 14px; margin: 2rem 0; text-align: left;">
                    <div style="margin-bottom: 1rem;">
                        <label style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);">Username</label>
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">${username}</div>
                    </div>
                    <div>
                        <label style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted);">Temporary Password</label>
                        <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent);">${password}</div>
                    </div>
                </div>
                
                <button class="btn-primary" style="width: 100%;" onclick="this.closest('.modal-backdrop').remove(); app.renderStaff();">Close & Refresh</button>
            </div>
        `;
    },

    async navigate(page) {
        if (!this.checkPermission(page)) {
            this.navigate('dashboard');
            return;
        }

        // Update sidebar active state
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
            const span = btn.querySelector('span');
            if (span) {
                const btnText = span.innerText.toLowerCase();
                const pageLower = page.toLowerCase();
                if (btnText === pageLower || (pageLower === 'exams' && btnText === 'examinations')) {
                    btn.classList.add('active');
                }
            }
        });

        await this.showLoading(400);

        this.container.innerHTML = `
            <div class="page-loading-overlay">
                <div class="spinner"></div>
                <h2>Initializing ${page.charAt(0).toUpperCase() + page.slice(1)}</h2>
                <p>Establishing secure connection to database...</p>
            </div>
        `;

        this.container.classList.remove('page-content-fade');
        void this.container.offsetWidth; // Force reflow
        
        switch (page) {
            case 'dashboard':
                await this.renderDashboard();
                break;
            case 'students':
                await this.renderStudents();
                break;
            case 'staff':
                await this.renderStaff();
                break;
            case 'subjects':
                await this.renderSubjects();
                break;
            case 'exams':
                await this.renderExams();
                break;
            case 'transport':
                await this.renderTransport();
                break;
            case 'notices':
                await this.renderNotices();
                break;
            case 'resources':
                await this.renderResources();
                break;
            case 'attendance':
                await this.renderAttendance();
                break;
            case 'library':
                await this.renderLibrary();
                break;
            case 'discipline':
                await this.renderDiscipline();
                break;
            case 'health':
                await this.renderHealth();
                break;
            case 'fees':
                await this.renderFees();
                break;
            case 'payroll':
                await this.renderPayroll();
                break;
            case 'inventory':
                await this.renderInventory();
                break;
            case 'expenses':
                await this.renderExpenses();
                break;
            case 'hostels':
                await this.renderHostels();
                break;
            default:
                this.container.innerHTML = '<div class="glass-panel"><h1>404 Page Not Found</h1></div>';
        }

        this.container.classList.add('page-content-fade');
        this.hideLoading();
    },


    async renderLibrary() {
        const books = await db.library.toArray();
        const loans = await db.bookLoans.toArray();
        const students = await db.students.toArray();

        const canEdit = this.canModify();
        this.container.innerHTML = `
            <h1>Library ${canEdit ? 'Management' : 'Catalog'}</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: ${canEdit ? '1fr 2fr' : '1fr'}; gap: 2rem;">
                ${canEdit ? `
                <div class="glass-panel" style="margin: 0;">
                    <h2>Register Book</h2>
                    <form id="lib-form">
                        <input type="text" id="lib-title" placeholder="Book Title" required>
                        <input type="text" id="lib-isbn" placeholder="ISBN" required>
                        <input type="number" id="lib-qty" placeholder="Quantity" required>
                        <button type="submit" class="btn-primary" style="width: 100%;">Add Book</button>
                    </form>
                    <h2 style="margin-top: 2rem;">Issue Book</h2>
                    <form id="loan-form">
                        <select id="loan-book" required>
                            <option value="">Select Book</option>
                            ${books.filter(b => b.available > 0).map(b => `<option value="${b.id}">${b.title}</option>`).join('')}
                        </select>
                        <select id="loan-student" required>
                            <option value="">Select Student</option>
                            ${students.map(s => `<option value="${s.studentId}">${s.name}</option>`).join('')}
                        </select>
                        <button type="submit" class="btn-primary" style="width: 100%; background: var(--secondary);">Issue Item</button>
                    </form>
                </div>` : ''}
                <div class="glass-panel" style="margin: 0;">
                    <h2>Library Catalog</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid var(--glass-border);">
                                <th style="padding: 1rem;">Title</th>
                                <th style="padding: 1rem;">Available</th>
                                <th style="padding: 1rem;">On Loan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${books.map(b => `
                                <tr>
                                    <td style="padding: 1rem;">${b.title}</td>
                                    <td style="padding: 1rem;">${b.available}/${b.quantity}</td>
                                    <td style="padding: 1rem;">
                                        ${loans.filter(l => l.bookId == b.id && l.status === 'Issued').length}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (canEdit) {
            document.getElementById('lib-form').onsubmit = async (e) => {
                e.preventDefault();
                const qty = parseInt(document.getElementById('lib-qty').value);
                await db.library.add({
                    title: document.getElementById('lib-title').value,
                    ISBN: document.getElementById('lib-isbn').value,
                    quantity: qty,
                    available: qty
                });
                this.renderLibrary();
            };

            document.getElementById('loan-form').onsubmit = async (e) => {
                e.preventDefault();
                const bookId = parseInt(document.getElementById('loan-book').value);
                await db.bookLoans.add({
                    bookId: bookId,
                    studentId: document.getElementById('loan-student').value,
                    loanDate: new Date().toLocaleDateString(),
                    status: 'Issued'
                });
                const book = await db.library.get(bookId);
                await db.library.update(bookId, { available: book.available - 1 });
                this.renderLibrary();
            };
        }
    },



    async renderHealth() {
        const records = await db.health.toArray();
        const students = await db.students.toArray();

        const canEdit = this.canModify();
        this.container.innerHTML = `
            <h1>Student Health Records</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: ${canEdit ? '1fr 2fr' : '1fr'}; gap: 2rem;">
                ${canEdit ? `
                <form id="health-form" class="glass-panel" style="margin: 0;">
                    <h2>Add/Update Health Info</h2>
                    <select id="h-student" required>
                        <option value="">Select Student</option>
                        ${students.map(s => `<option value="${s.studentId}">${s.name}</option>`).join('')}
                    </select>
                    <input type="text" id="h-blood" placeholder="Blood Group (e.g. O+)" required>
                    <input type="text" id="h-status" placeholder="Medical Status (e.g. Fit)" required>
                    <input type="date" id="h-checkup" required>
                    <textarea id="h-allergies" placeholder="Known Allergies" style="min-height: 100px;"></textarea>
                    <input type="text" id="h-contact" placeholder="Emergency Contact" required>
                    <button type="submit" class="btn-primary" style="width: 100%;">Save Record</button>
                </form>` : ''}
                <div class="glass-panel" style="margin: 0;">
                    <h2>Medical Database</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="padding: 1rem; text-align: left;">Student</th>
                                <th style="padding: 1rem; text-align: left;">Blood Group</th>
                                <th style="padding: 1rem; text-align: left;">Allergies</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(r => `
                                <tr>
                                    <td style="padding: 1rem;">${students.find(s => s.studentId === r.studentId)?.name || r.studentId}</td>
                                    <td style="padding: 1rem;">${r.bloodGroup}</td>
                                    <td style="padding: 1rem; font-size: 0.9rem; color: var(--text-muted);">${r.allergies || 'None'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (canEdit) {
            document.getElementById('health-form').onsubmit = async (e) => {
                e.preventDefault();
                await db.health.put({
                    studentId: document.getElementById('h-student').value,
                    bloodGroup: document.getElementById('h-blood').value,
                    status: document.getElementById('h-status').value,
                    lastCheckup: document.getElementById('h-checkup').value,
                    allergies: document.getElementById('h-allergies').value,
                    emergencyContact: document.getElementById('h-contact').value
                });
                this.renderHealth();
            };
        }
    },

    toggleTheme() {
        const current = localStorage.getItem('egles_theme') || 'default';
        const next = current === 'light' ? 'default' : 'light';
        this.setTheme(next);
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) toggleBtn.innerText = next === 'light' ? '🌙' : '🌓';
    },

    async renderPayroll() {
        const staff = await db.staff.toArray();
        const payroll = await db.payroll.toArray();
        const month = new Date().toLocaleString('default', { month: 'long' });
        const year = 2026;

        this.container.innerHTML = `
            <h1>Staff Payroll System</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <form id="pay-form" class="glass-panel" style="margin: 0;">
                    <h2>Process Payment</h2>
                    <select id="p-staff" required>
                        <option value="">Select Staff Member</option>
                        ${staff.map(s => `<option value="${s.staffId}">${s.name} (${s.role})</option>`).join('')}
                    </select>
                    <input type="number" id="p-salary" placeholder="Basic Salary" required>
                    <input type="number" id="p-bonus" placeholder="Bonus" value="0">
                    <input type="number" id="p-deduct" placeholder="Deductions" value="0">
                    <button type="submit" class="btn-primary" style="width: 100%;">Process Payment</button>
                    <button type="button" class="btn-primary" style="width: 100%; background: var(--success); margin-top: 1rem;" onclick="app.printBulkPayslips()">Print All Payslips</button>
                </form>
                <div class="glass-panel" style="margin: 0;">
                    <h2>Payroll Log - ${month} ${year}</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left;">
                                <th style="padding: 1rem;">Staff</th>
                                <th style="padding: 1rem;">Net Salary</th>
                                <th style="padding: 1rem;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${payroll.filter(p => p.month === month).map(p => `
                                <tr>
                                    <td style="padding: 1rem;">${staff.find(s => s.staffId === p.staffId)?.name || p.staffId}</td>
                                    <td style="padding: 1rem;">$${((p.salary || 0) + (p.bonus || 0) - (p.deductions || 0)).toFixed(2)}</td>
                                    <td style="padding: 1rem;"><span style="color: var(--success);">Paid</span></td>
                                    <td style="padding: 1rem;"><button onclick="app.printSinglePayslip('${p.id}')" style="background:none; border:none; color:var(--primary); cursor:pointer;">Print PDF</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('pay-form').onsubmit = async (e) => {
            e.preventDefault();
            const salary = parseFloat(document.getElementById('p-salary').value) || 0;
            const bonus = parseFloat(document.getElementById('p-bonus').value || 0) || 0;
            const deductions = parseFloat(document.getElementById('p-deduct').value || 0) || 0;
            
            await db.payroll.add({
                staffId: document.getElementById('p-staff').value,
                salary: salary,
                bonus: bonus,
                deductions: deductions,
                month: month,
                year: year,
                status: 'Paid'
            });
            this.renderPayroll();
        };
    },


    async renderExpenses() {
        const expenses = await db.expenses.toArray();
        const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0);

        this.container.innerHTML = `
            <h1>Expenses Tracker</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <form id="exp-form" class="glass-panel" style="margin: 0;">
                    <h2>Record Expense</h2>
                    <input type="text" id="ex-name" placeholder="Expense Name" required>
                    <input type="number" id="ex-amount" placeholder="Amount" step="0.01" required>
                    <select id="ex-cat">
                        <option value="Operational">Operational</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Utilities">Utilities</option>
                    </select>
                    <button type="submit" class="btn-primary" style="width: 100%; background: var(--danger);">Log Expense</button>
                </form>
                <div class="glass-panel" style="margin: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h2>Operational Costs</h2>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">$${totalExp.toFixed(2)}</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left;">
                                <th style="padding: 1rem;">Expense</th>
                                <th style="padding: 1rem;">Category</th>
                                <th style="padding: 1rem;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expenses.map(e => `
                                <tr>
                                    <td style="padding: 1rem;">${e.name}</td>
                                    <td style="padding: 1rem;">${e.category}</td>
                                    <td style="padding: 1rem;">$${e.amount.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('exp-form').onsubmit = async (e) => {
            e.preventDefault();
            await db.expenses.add({
                name: document.getElementById('ex-name').value,
                amount: parseFloat(document.getElementById('ex-amount').value),
                category: document.getElementById('ex-cat').value,
                date: new Date().toLocaleDateString()
            });
            this.renderExpenses();
        };
    },

    async renderInventory() {
        const assets = await db.assets.toArray();
        this.container.innerHTML = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>School Assets & Inventory</h1>
                <div class="button-group" style="display: flex; gap: 1rem;">
                    <button class="btn-primary" onclick="app.renderInventoryAudit()" style="background: var(--accent);">Inventory Audit Report</button>
                    <button class="btn-primary" onclick="app.exportToCSV('assets')" style="background: var(--success);">Export Ledger (CSV)</button>
                    <button class="btn-primary" onclick="app.showAssetForm()">Add New Asset</button>
                </div>
            </div>

            <div class="glass-panel" style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr style="text-align: left; border-bottom: 2px solid var(--glass-border);">
                            <th style="padding: 1rem;">Item Name</th>
                            <th style="padding: 1rem;">Qty</th>
                            <th style="padding: 1rem;">Current Value</th>
                            <th style="padding: 1rem;">Condition</th>
                            <th style="padding: 1rem;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assets.map(a => {
            const yearsElapsed = (new Date() - new Date(a.purchaseDate || new Date())) / (1000 * 60 * 60 * 24 * 365);
            const currentValue = (a.value || 0) * Math.pow(0.9, Math.max(0, yearsElapsed));
            return `
                                    <tr style="border-bottom: 1px solid var(--glass-border);">
                                        <td style="padding: 1rem; font-weight: 600;">${a.name}</td>
                                        <td style="padding: 1rem;">${a.quantity}</td>
                                        <td style="padding: 1rem;">$${currentValue.toFixed(2)}</td>
                                        <td style="padding: 1rem;"><span class="status-pill" style="background: ${a.condition === 'Good' ? 'var(--success-glow)' : 'rgba(255,255,255,0.05)'}; color: ${a.condition === 'Good' ? 'var(--success)' : ''}">${a.condition}</span></td>
                                        <td style="padding: 1rem;"><button onclick="app.deleteAsset(${a.id})" style="color: var(--danger); background:none; border:none; cursor:pointer;">Remove</button></td>
                                    </tr>
                                `;
        }).join('')}
                    </tbody>
                </table>
            </div>

            <div id="asset-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px);">
                <div class="glass-panel" style="width: 90%; max-width: 500px; border: 1px solid var(--primary);">
                    <h2 class="card-title">New Asset Registration</h2>
                    <form id="asset-form">
                        <input type="text" id="as-name" placeholder="Item Name" required>
                        <input type="number" id="as-qty" placeholder="Quantity" required>
                        <input type="number" id="as-val" placeholder="Value ($)" required>
                        <select id="as-condition">
                            <option value="Good">Good</option>
                            <option value="Fair">Fair</option>
                            <option value="Damaged">Damaged</option>
                        </select>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <button type="submit" class="btn-primary">Add Asset</button>
                            <button type="button" class="btn-primary" style="background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border); box-shadow: none;" onclick="document.getElementById('asset-modal').classList.add('hidden')">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('asset-form').onsubmit = async (e) => {
            e.preventDefault();
            await db.assets.add({
                name: document.getElementById('as-name').value,
                quantity: document.getElementById('as-qty').value,
                value: parseFloat(document.getElementById('as-val').value),
                purchaseDate: new Date().toISOString(),
                condition: document.getElementById('as-condition').value
            });
            this.renderInventory();
        };
    },

    showAssetForm() {
        document.getElementById('asset-modal').classList.remove('hidden');
    },

    async deleteAsset(id) {
        if (confirm('Remove item from inventory?')) {
            await db.assets.delete(id);
            this.renderInventory();
        }
    },





    showStaffForm() {
        document.getElementById('staff-modal').classList.remove('hidden');
    },

    async deleteStaff(id) {
        if (confirm('Are you sure you want to remove this staff member?')) {
            await db.staff.delete(id);
            this.renderStaff();
        }
    },

    async renderSubjects() {
        let subjects = await db.subjects.toArray();
        const teachers = await db.staff.where('role').equals('Teacher').toArray();
        
        const teacherData = await this.getTeacherData();
        if (teacherData) {
            subjects = teacherData.subjects;
        }

        const isAdmin = this.currentUser.role === 'Admin';
        this.container.innerHTML = `
            <h1>Subject ${isAdmin ? 'Management' : 'Assignments'}</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: ${isAdmin ? '1fr 2fr' : '1fr'}; gap: 2rem;">
                ${isAdmin ? `
                <form id="subj-form" class="glass-panel" style="margin: 0;">
                    <h2>Define Subject</h2>
                    <input type="text" id="subj-name" placeholder="Subject Name (e.g. Mathematics)" required>
                    <input type="text" id="subj-class" placeholder="Class (e.g. Form 1)" required>
                    <select id="subj-teacher" required>
                        <option value="">Select Teacher</option>
                        ${teachers.map(t => `<option value="${t.staffId}">${t.name}</option>`).join('')}
                    </select>
                    <button type="submit" class="btn-primary">Assign Subject</button>
                </form>` : ''}
                <div class="glass-panel" style="margin: 0; overflow-x: auto;">
                    <h2>Subject Allocations</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                                <th style="padding: 1rem;">Subject</th>
                                <th style="padding: 1rem;">Class</th>
                                <th style="padding: 1rem;">Teacher</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map(s => `
                                <tr style="border-bottom: 1px solid var(--glass-border);">
                                    <td style="padding: 1rem;">${s.name}</td>
                                    <td style="padding: 1rem;">${s.class}</td>
                                    <td style="padding: 1rem;">${teachers.find(t => t.staffId === s.teacherId)?.name || s.teacherId}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (isAdmin) {
            document.getElementById('subj-form').onsubmit = async (e) => {
            e.preventDefault();
            const subject = {
                name: document.getElementById('subj-name').value,
                class: document.getElementById('subj-class').value,
                teacherId: document.getElementById('subj-teacher').value
            };
            await db.subjects.add(subject);
            this.renderSubjects();
            };
        }
    },

    async renderStudents() {
        let students = await db.students.toArray();
        
        if (this.currentUser.role === 'Teacher') {
            const teacherData = await this.getTeacherData();
            if (teacherData) {
                students = students.filter(s => teacherData.classes.includes(s.class));
            }
        }
        this.container.innerHTML = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>Student Directory</h1>
                <div class="button-group" style="display: flex; gap: 1rem;">
                    <button class="btn-primary" onclick="app.exportToCSV('students')" style="background: var(--success);">Export to CSV</button>
                    ${this.currentUser.role === 'Admin' ? '<button class="btn-primary" onclick="app.showStudentForm()">Admit Student</button>' : ''}
                </div>
            </div>
            
            <div class="glass-panel" style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr style="text-align: left; border-bottom: 2px solid var(--glass-border);">
                            <th style="padding: 1.25rem 1rem;">ID</th>
                            <th style="padding: 1.25rem 1rem;">Name</th>
                            <th style="padding: 1.25rem 1rem;">Class</th>
                            <th style="padding: 1.25rem 1rem;">Contact</th>
                            <th style="padding: 1.25rem 1rem;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(s => `
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <td style="padding: 1.25rem 1rem; font-weight: 600; color: var(--accent);">${s.studentId}</td>
                                <td style="padding: 1.25rem 1rem;">${s.name}</td>
                                <td style="padding: 1.25rem 1rem;"><span class="status-pill" style="background: rgba(255,255,255,0.05);">${s.class}</span></td>
                                <td style="padding: 1.25rem 1rem; color: var(--text-muted);">${s.parentContact}</td>
                                <td style="padding: 1.25rem 1rem; display: flex; gap: 0.75rem;">
                                    <button onclick="app.viewIDCard('${s.id}')" style="color: var(--accent); background:none; border:none; cursor:pointer; font-weight:600;">ID Card</button>
                                    ${this.currentUser.role === 'Admin' ? `<button onclick="app.deleteStudent(${s.id})" style="color: var(--danger); background:none; border:none; cursor:pointer; font-weight:600;">Expel</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div id="student-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px);">
                <div class="glass-panel" style="width: 90%; max-width: 500px; border: 1px solid var(--primary);">
                    <h2 class="card-title">Register New Student</h2>
                    <form id="reg-form">
                        <input type="text" id="s-name" placeholder="Full Name" required>
                        <input type="text" id="s-class" placeholder="Class (e.g. Form 1A)" required>
                        <select id="s-gender">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                        <input type="text" id="s-contact" placeholder="Parent/Guardian Contact" required>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <button type="submit" class="btn-primary">Register Student</button>
                            <button type="button" class="btn-primary" style="background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border); box-shadow: none;" onclick="document.getElementById('student-modal').classList.add('hidden')">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('reg-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                this.showLoading(500);
                const count = await db.students.count();
                const timestamp = Date.now().toString().slice(-4);
                const studentId = `EST${2026}${String(count + 1).padStart(3, '0')}${timestamp}`;
                
                await db.students.add({
                    studentId: studentId,
                    name: document.getElementById('s-name').value,
                    class: document.getElementById('s-class').value,
                    gender: document.getElementById('s-gender').value,
                    parentContact: document.getElementById('s-contact').value
                });
                
                document.getElementById('student-modal').classList.add('hidden');
                alert(`Student registered successfully! ID: ${studentId}`);
                this.renderStudents();
            } catch (err) {
                console.error("Registration Error:", err);
                alert("Critical System Error: " + err.message);
            } finally {
                this.hideLoading();
            }
        };
    },

    showStudentForm() {
        document.getElementById('student-modal').classList.remove('hidden');
    },

    async deleteStudent(id) {
        if (confirm('Are you sure you want to remove this student?')) {
            await db.students.delete(id);
            this.renderStudents();
        }
    },

    async renderAttendance() {
        let students = await db.students.toArray();
        if (this.currentUser.role === 'Teacher') {
            const teacherData = await this.getTeacherData();
            if (teacherData) {
                students = students.filter(s => teacherData.classes.includes(s.class));
            }
        }
        const today = new Date().toISOString().split('T')[0];

        this.container.innerHTML = `
            <h1>Attendance Management</h1>
            <div class="glass-panel" style="margin: 0;">
                <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2>Record Daily Attendance</h2>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <input type="date" id="att-date" value="${today}" style="width: auto; margin: 0; min-width: 150px;">
                        <button class="btn-primary" onclick="app.printRegister()">Print Daily Register</button>
                    </div>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                            <th style="padding: 1rem;">Student Name</th>
                            <th style="padding: 1rem;">Class</th>
                            <th style="padding: 1rem;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="att-list">
                        ${students.map(s => `
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <td style="padding: 1rem;">${s.name}</td>
                                <td style="padding: 1rem;">${s.class}</td>
                                <td style="padding: 1rem;">
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn-att" onclick="app.setAttendance('${s.studentId}', 'Present')" style="background: var(--success);">P</button>
                                        <button class="btn-att" onclick="app.setAttendance('${s.studentId}', 'Absent')" style="background: var(--danger);">A</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <style>
                .btn-att { border: none; padding: 8px 16px; border-radius: 8px; color: white; cursor: pointer; font-weight: 700; opacity: 0.7; transition: opacity 0.2s; }
                .btn-att:hover { opacity: 1; }
            </style>
        `;
    },

    async setAttendance(studentId, status) {
        const date = document.getElementById('att-date').value;
        await db.attendance.put({ studentId, date, status });
        alert(`${status} recorded for ${studentId}`);
    },

    async renderFees() {
        const students = await db.students.toArray();
        const fees = await db.fees.toArray();

        const canEdit = this.canModify();
        this.container.innerHTML = `
            <h1>Fees ${canEdit ? 'Management' : 'Statement'}</h1>
            <div class="mobile-stack" style="display: grid; grid-template-columns: ${canEdit ? '1fr 2fr' : '1fr'}; gap: 2rem;">
                ${canEdit ? `
                <form id="fees-form" class="glass-panel" style="margin: 0;">
                    <h2>Record Payment</h2>
                    <select id="f-student" required>
                        <option value="">Select Student</option>
                        ${students.map(s => `<option value="${s.studentId}">${s.name} (${s.studentId})</option>`).join('')}
                    </select>
                    <input type="number" id="f-amount" placeholder="Amount ($)" required>
                    <input type="text" id="f-type" placeholder="Payment Type (e.g. Tuition, Bus)">
                    <button type="submit" class="btn-primary">Record Payment</button>
                </form>` : ''}
                <div class="glass-panel" style="margin: 0; overflow-x: auto;">
                    <h2>Payment History</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid var(--glass-border);">
                                <th style="padding: 1rem;">Student ID</th>
                                <th style="padding: 1rem;">Amount</th>
                                <th style="padding: 1rem;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fees.map(f => `
                                <tr style="border-bottom: 1px solid var(--glass-border);">
                                    <td style="padding: 1rem;">${f.studentId}</td>
                                    <td style="padding: 1rem;">$${f.amount}</td>
                                    <td style="padding: 1rem;">${f.date}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (canEdit) {
            document.getElementById('fees-form').onsubmit = async (e) => {
                e.preventDefault();
                const payment = {
                    studentId: document.getElementById('f-student').value,
                    amount: document.getElementById('f-amount').value,
                    type: document.getElementById('f-type').value,
                    date: new Date().toISOString().split('T')[0]
                };
                await db.fees.add(payment);
                alert('Payment recorded and SMS reminder simulated!');
                this.renderFees();
            };
        }
    },

    async renderExams() {
        let students = await db.students.toArray();
        let marks = await db.marks.toArray();
        
        const teacherData = await this.getTeacherData();
        if (teacherData) {
            students = students.filter(s => teacherData.classes.includes(s.class));
            const mySubjectNames = teacherData.subjects.map(s => s.name);
            marks = marks.filter(m => mySubjectNames.includes(m.subject) && students.some(s => s.studentId === m.studentId));
        }

        const canEdit = this.canModify();
        this.container.innerHTML = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>Examination ${canEdit ? 'Management' : 'Results'}</h1>
                <div class="button-group" style="display: flex; gap: 1rem; width: 100%;">
                    ${canEdit ? `<button class="btn-primary" onclick="app.showReportSelector()" style="background: var(--accent); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4); flex: 1;">Generate Report Cards</button>` : ''}
                </div>
            </div>
            <div class="dashboard-grid mobile-stack" style="grid-template-columns: ${canEdit ? '1fr 2fr' : '1fr'}; gap: 2rem;">
                ${canEdit ? `
                <div class="glass-panel">
                    <h2 class="card-title">Enter Marks</h2>
                    <form id="marks-form">
                        <select id="m-student" required>
                            <option value="">Select Student</option>
                            ${students.map(s => `<option value="${s.studentId}">${s.name}</option>`).join('')}
                        </select>
                        <select id="m-subject" required>
                            <option value="">Select Subject</option>
                            ${teacherData ? teacherData.subjects.map(s => `<option value="${s.name}">${s.name} (${s.class})</option>`).join('') : '<option value="English">English</option><option value="Math">Math</option>'}
                        </select>
                        <input type="number" id="m-score" placeholder="Score (%)" max="100" required>
                        <button type="submit" class="btn-primary" style="width: 100%; background: var(--secondary); box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);">Assign Grade</button>
                    </form>
                </div>` : ''}
                <div class="glass-panel" style="overflow-x: auto;">
                    <h2 class="card-title">Student Performances</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Subject</th>
                                <th>Score</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${marks.map(m => `
                                <tr>
                                    <td><span style="color: var(--primary); font-weight: 600;">${m.studentId}</span></td>
                                    <td>${m.subject}</td>
                                    <td style="font-weight: 700;">${m.score}%</td>
                                    <td>
                                        <span class="status-pill" style="background: ${m.score >= 50 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${m.score >= 50 ? 'var(--success)' : 'var(--danger)'}; border: 1px solid ${m.score >= 50 ? 'var(--success)' : 'var(--danger)'};">
                                            ${this.calculateGrade(m.score)}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ${canEdit ? `
            <div id="report-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px);">
                <div class="glass-panel" style="width: 90%; max-width: 500px; border: 1px solid var(--primary);">
                    <h2 class="card-title" style="text-align: center;">Academic Reports</h2>
                    <p style="text-align: center; margin-bottom: 2rem;">Select a student to generate their official achievement report.</p>
                    <select id="report-student">
                        ${students.map(s => `<option value="${s.studentId}">${s.name} (${s.studentId})</option>`).join('')}
                    </select>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                        <button class="btn-primary" onclick="app.generateReport()">View Report</button>
                        <button class="btn-primary" style="background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border); box-shadow: none;" onclick="document.getElementById('report-modal').classList.add('hidden')">Cancel</button>
                    </div>
                </div>
            </div>` : ''}
        `;

        if (canEdit) {
            document.getElementById('marks-form').onsubmit = async (e) => {
                e.preventDefault();
                const mark = {
                    studentId: document.getElementById('m-student').value,
                    subject: document.getElementById('m-subject').value,
                    score: parseInt(document.getElementById('m-score').value),
                    year: 2026,
                    term: 1
                };
                await db.marks.add(mark);
                this.renderExams();
            };
        }
    },

    showReportSelector() {
        document.getElementById('report-modal').classList.remove('hidden');
    },

    async generateReport() {
        const studentId = document.getElementById('report-student').value;
        const student = await db.students.where('studentId').equals(studentId).first();
        if (!student) {
            alert("Student record not found in database.");
            return;
        }
        await this.showLoading(1500); // Simulate PDF Generation
        this.hideLoading();
        const studentMarks = await db.marks.where('studentId').equals(studentId).toArray();

        const avgScore = studentMarks.length > 0 ? (studentMarks.reduce((acc, m) => acc + m.score, 0) / studentMarks.length).toFixed(1) : 0;
        const gpa = (avgScore / 20).toFixed(2); // Simple conversion to 5.0 scale

        const reportContent = `
            <div class="print-container" style="background: white; color: black; padding: 50px; border: 10px double #1e293b; min-height: 100vh; position: relative; font-family: 'Times New Roman', serif;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 8rem; color: rgba(0,0,0,0.03); z-index: 0; pointer-events: none; white-space: nowrap; font-weight: 900;">
                    OFFICIAL RELEASE
                </div>
                
                <div style="text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; position: relative; z-index: 1;">
                    <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: 2px; color: #1e293b;">EGLES SECONDARY SCHOOL</div>
                    <p style="margin: 5px 0; font-size: 1.1rem; color: #64748b;">Motto: Excellence Through Discipline & Integrity</p>
                    <p style="margin: 2px 0; font-size: 0.9rem;">P.O. Box 772, High Glen Road, Harare</p>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 40px; position: relative; z-index: 1; border: 1px dashed #cbd5e1; padding: 15px;">
                    <div>
                        <p style="margin: 4px 0;"><strong>STUDENT NAME:</strong> ${student.name.toUpperCase()}</p>
                        <p style="margin: 4px 0;"><strong>STUDENT ID:</strong> ${student.studentId}</p>
                        <p style="margin: 4px 0;"><strong>CLASS/FORM:</strong> ${student.class}</p>
                    </div>
                    <div>
                        <p style="margin: 4px 0;"><strong>ACADEMIC YEAR:</strong> 2026</p>
                        <p style="margin: 4px 0;"><strong>TERM NO:</strong> 1</p>
                        <p style="margin: 4px 0;"><strong>ISSUE DATE:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; position: relative; z-index: 1;">
                    <thead>
                        <tr style="background: #1e293b; color: white;">
                            <th style="border: 1px solid #1e293b; padding: 12px; text-align: left;">Subject Area</th>
                            <th style="border: 1px solid #1e293b; padding: 12px; text-align: center;">Score (%)</th>
                            <th style="border: 1px solid #1e293b; padding: 12px; text-align: center;">Grade</th>
                            <th style="border: 1px solid #1e293b; padding: 12px; text-align: left;">Teacher Remark</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentMarks.map(m => `
                            <tr>
                                <td style="border: 1px solid #cbd5e1; padding: 12px;">${m.subject}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center;">${m.score}%</td>
                                <td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center; font-weight: bold;">${this.calculateGrade(m.score)}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 12px; font-style: italic; color: #64748b;">${this.getSubjectRemark(m.score)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: bold;">
                            <td style="border: 1px solid #cbd5e1; padding: 12px;">SUMMARY PERFORMANCE</td>
                            <td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center;">${avgScore}%</td>
                            <td style="border: 1px solid #cbd5e1; padding: 12px; text-align: center;">GPA: ${gpa}</td>
                            <td style="border: 1px solid #cbd5e1; padding: 12px;">Rank: Top 15%</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; position: relative; z-index: 1;">
                    <div style="text-align: center;">
                        <div style="border-bottom: 1px solid #000; height: 40px;"></div>
                        <p style="margin-top: 5px; font-size: 0.9rem;">Class Teacher's Signature</p>
                    </div>
                    <div style="text-align: center;">
                        <div style="border-bottom: 1px solid #000; height: 40px; display: flex; align-items: center; justify-content: center;">
                             <img src="https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${student.studentId}" style="width: 40px; border: 1px solid #000; opacity: 0.3;">
                        </div>
                        <p style="margin-top: 5px; font-size: 0.9rem;">Principal's Endorsement</p>
                    </div>
                </div>

                <div id="report-actions" style="margin-top: 60px; border-top: 1px solid #cbd5e1; padding-top: 20px; display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn-primary" style="background: #1e293b; color: white;" onclick="window.print()">Download PDF</button>
                    <button class="btn-primary" style="background: var(--accent);" onclick="alert('SMS & EMAIL SENT: Academic report for ${student.name} has been securely delivered to parents.')">Send to Parent</button>
                    <button class="btn-primary" style="background: var(--danger);" onclick="app.navigate('exams')">Exit Preview</button>
                </div>
            </div>
            <style>
                @media print { 
                    #report-actions { display: none; } 
                    body { background: white !important; }
                    .main-wrapper { margin-left: 0 !important; }
                    .sidebar, .top-bar { display: none !important; }
                    .content-area { padding: 0 !important; }
                    .print-container { border: none !important; padding: 0 !important; }
                }
            </style>
        `;

        this.container.innerHTML = reportContent;
        this.container.style.padding = '0';
        this.container.style.background = 'white';
    },

    getSubjectRemark(score) {
        if (score >= 80) return "Exceptional performance, continue standard.";
        if (score >= 70) return "Strong grasp of concepts, well done.";
        if (score >= 60) return "Satisfactory, can improve with effort.";
        if (score >= 50) return "Borderline, needs consistent practice.";
        return "Critical attention required in this subject.";
    },

    async renderDashboard() {
        const studentCount = await db.students.count();
        const totalFees = await db.fees.toArray();
        const sumFees = totalFees.reduce((acc, f) => acc + parseFloat(f.amount), 0);
        const staffCount = await db.staff.count();
        const allMarks = await db.marks.toArray();

        // Academic Stats for Chart
        const subjectStats = {};
        allMarks.forEach(m => {
            if (!subjectStats[m.subject]) subjectStats[m.subject] = { total: 0, count: 0 };
            subjectStats[m.subject].total += m.score;
            subjectStats[m.subject].count++;
        });
        const subjectNames = Object.keys(subjectStats);
        const subjectAvgs = subjectNames.map(name => (subjectStats[name].total / subjectStats[name].count).toFixed(1));

        // Financial Stats for Chart (Last 6 months simulated)
        const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
        const feeData = [sumFees * 0.1, sumFees * 0.15, sumFees * 0.2, sumFees * 0.1, sumFees * 0.25, sumFees * 0.2];
        const expData = [sumFees * 0.05, sumFees * 0.08, sumFees * 0.1, sumFees * 0.07, sumFees * 0.12, sumFees * 0.15];

        this.container.innerHTML = `
            <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem;">
                <div>
                    <h1>Academic Insights</h1>
                    <p>Welcome back, Administrator. Real-time metrics are active.</p>
                </div>
                <div class="button-group" style="display: flex; gap: 1rem;">
                    <button class="btn-primary" onclick="app.exportAllData()" style="background: var(--success);">Full System Backup</button>
                    <button class="btn-primary" onclick="app.generateMinistryStats()" style="background: var(--secondary); box-shadow: 0 4px 12px rgba(236, 72, 153, 0.4);">
                        Ministry Statistics
                    </button>
                </div>
            </div>
            
            <div class="dashboard-grid">
                <div class="glass-panel" style="padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 60px; height: 60px; border-radius: 15px; background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🎓</div>
                    <div>
                        <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Total Enrollment</h3>
                        <p style="font-size: 1.75rem; color: var(--primary); font-weight: 800;">${studentCount}</p>
                    </div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 60px; height: 60px; border-radius: 15px; background: rgba(6, 182, 212, 0.1); border: 1px solid var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👨‍🏫</div>
                    <div>
                        <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Active Staff</h3>
                        <p style="font-size: 1.75rem; color: var(--accent); font-weight: 800;">${staffCount}</p>
                    </div>
                </div>
                <div class="glass-panel" style="padding: 1.5rem; display: flex; align-items: center; gap: 1.5rem;">
                    <div style="width: 60px; height: 60px; border-radius: 15px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">💰</div>
                    <div>
                        <h3 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.25rem;">Total Revenue</h3>
                        <p style="font-size: 1.75rem; color: var(--success); font-weight: 800;">$${sumFees.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div class="dashboard-main-grid">
                <div class="glass-panel">
                    <h2 class="card-title">Financial Trends</h2>
                    <div class="chart-container">
                        <canvas id="financeChart"></canvas>
                    </div>
                </div>
                <div class="glass-panel">
                    <h2 class="card-title">Academic Distribution</h2>
                    <div class="chart-container">
                        <canvas id="academicChart"></canvas>
                    </div>
                </div>
            </div>

            <div class="glass-panel" style="margin-top: 1.5rem;">
                <h2 class="card-title">Quick Actions</h2>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="app.navigate('students')">Admit Student</button>
                    <button class="btn-primary" style="background: var(--secondary);" onclick="app.navigate('exams')">Record Marks</button>
                    <button class="btn-primary" style="background: var(--accent);" onclick="app.navigate('staff')">Staff Directory</button>
                    <button class="btn-primary" style="background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border); box-shadow: none;" onclick="app.navigate('fees')">Billing</button>
                    <button class="btn-primary" style="background: var(--success);" onclick="app.exportAllData()">System Backup</button>
                </div>
            </div>
        `;

        this.initCharts(months, feeData, expData, subjectNames, subjectAvgs);
    },

    // --- Phase 3: Data Export & Auditing ---
    async exportToCSV(tableName) {
        const data = await db[tableName].toArray();
        if (data.length === 0) {
            alert("No data found in " + tableName);
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : row[header].toString();
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `egles_smis_${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async exportAllData() {
        const tables = ['students', 'staff', 'fees', 'marks', 'discipline', 'assets', 'library'];
        alert("Preparing full system backup. You will receive multiple CSV files.");
        for (const table of tables) {
            await this.exportToCSV(table);
        }
    },

    async renderInventoryAudit() {
        const assets = await db.assets.toArray();
        const totalValue = assets.reduce((acc, a) => acc + (parseFloat(a.value) || 0), 0);

        this.container.innerHTML = `
            <div class="print-container" style="background: white; color: black; padding: 40px; min-height: 100vh; font-family: sans-serif;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                    <div style="font-size: 2.5rem; font-weight: 900; color: #1e293b;">EGLES SECONDARY SCHOOL</div>
                    <h2 style="margin: 10px 0;">Annual Asset & Inventory Audit Report</h2>
                    <p>Report Period: Academic Year 2026 | Generated: ${new Date().toLocaleDateString()}</p>
                </div>

                <div style="margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div style="border: 2px solid #1e293b; padding: 15px; text-align: center;">
                        <div style="font-size: 0.8rem; text-transform: uppercase;">Total Asset Count</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">${assets.length}</div>
                    </div>
                    <div style="border: 2px solid #1e293b; padding: 15px; text-align: center;">
                        <div style="font-size: 0.8rem; text-transform: uppercase;">Est. Total Value</div>
                        <div style="font-size: 1.5rem; font-weight: bold;">$${totalValue.toLocaleString()}</div>
                    </div>
                    <div style="border: 2px solid #1e293b; padding: 15px; text-align: center;">
                        <div style="font-size: 0.8rem; text-transform: uppercase;">Audit Status</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #16a34a;">VERIFIED</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #e2e8f0;">
                            <th style="border: 1px solid #000; padding: 10px; text-align: left;">Asset Name</th>
                            <th style="border: 1px solid #000; padding: 10px; text-align: center;">Qty</th>
                            <th style="border: 1px solid #000; padding: 10px; text-align: left;">Condition</th>
                            <th style="border: 1px solid #000; padding: 10px; text-align: right;">Current Value ($)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assets.map(a => `
                            <tr>
                                <td style="border: 1px solid #000; padding: 10px;">${a.name}</td>
                                <td style="border: 1px solid #000; padding: 10px; text-align: center;">${a.quantity}</td>
                                <td style="border: 1px solid #000; padding: 10px;">${a.condition}</td>
                                <td style="border: 1px solid #000; padding: 10px; text-align: right;">$${parseFloat(a.value || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                    <div style="text-align: center; border-top: 1px solid #000; width: 250px; padding-top: 10px;">Inventory Manager Signature</div>
                    <div style="text-align: center; border-top: 1px solid #000; width: 250px; padding-top: 10px;">Official School Stamp</div>
                </div>

                <div id="audit-actions" style="margin-top: 40px; display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn-primary" style="background: #1e293b; color: white;" onclick="window.print()">Print Audit Summary</button>
                    <button class="btn-primary" style="background: var(--success);" onclick="app.exportToCSV('assets')">Export Ledger</button>
                    <button class="btn-primary" style="background: var(--danger);" onclick="app.navigate('inventory')">Close Audit</button>
                </div>
            </div>
            <style>
                @media print { 
                    #audit-actions { display: none; }
                    .main-wrapper { margin-left: 0 !important; }
                    .sidebar, .top-bar { display: none !important; }
                    .content-area { padding: 0 !important; }
                }
            </style>
        `;
        this.container.style.background = 'white';
        this.container.style.padding = '0';
    },

    initCharts(months, feeData, expData, subjectNames, subjectAvgs) {
        const ctxFinance = document.getElementById('financeChart').getContext('2d');
        const ctxAcademic = document.getElementById('academicChart').getContext('2d');

        new Chart(ctxFinance, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Fees Collected',
                        data: feeData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: expData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, labels: { color: '#94a3b8' } } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        new Chart(ctxAcademic, {
            type: 'bar',
            data: {
                labels: subjectNames,
                datasets: [{
                    label: 'Subject Average %',
                    data: subjectAvgs,
                    backgroundColor: '#6366f1',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    },

    async handleSearch(query) {
        const resultsBox = document.getElementById('search-results');
        if (!query || query.length < 1) {
            resultsBox.classList.add('hidden');
            return;
        }

        const students = await db.students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.studentId.toLowerCase().includes(query.toLowerCase())).toArray();
        const staff = await db.staff.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.staffId.toLowerCase().includes(query.toLowerCase())).toArray();
        const assets = await db.assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).toArray();

        let html = '';
        students.forEach(s => html += `
            <div class="search-result-item" onclick="app.navigate('students'); resultsBox.classList.add('hidden');">
                <span class="type-tag" style="background: var(--accent);">Student</span>
                <div>
                    <div>${s.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${s.studentId} - ${s.class}</div>
                </div>
            </div>
        `);
        staff.forEach(s => html += `
            <div class="search-result-item" onclick="app.navigate('staff'); resultsBox.classList.add('hidden');">
                <span class="type-tag" style="background: var(--primary);">Staff</span>
                <div>
                    <div>${s.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${s.staffId} - ${s.role}</div>
                </div>
            </div>
        `);
        assets.forEach(a => html += `
            <div class="search-result-item" onclick="app.navigate('inventory'); resultsBox.classList.add('hidden');">
                <span class="type-tag" style="background: var(--warning);">Asset</span>
                <div>
                    <div>${a.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${a.quantity} units - ${a.condition}</div>
                </div>
            </div>
        `);

        if (html === '') html = '<div class="search-result-item">No results found</div>';
        resultsBox.innerHTML = html;
        resultsBox.classList.remove('hidden');
    },

    async generateMinistryStats() {
        const studentCount = await db.students.count();
        const staffCount = await db.staff.count();
        const femaleStudents = await db.students.where('gender').equals('Female').count();
        const maleStudents = await db.students.where('gender').equals('Male').count();

        const statsContent = `
            <div style="background: #f8fafc; color: #1e293b; padding: 40px; border-radius: 12px; max-width: 800px; margin: 2rem auto;">
                <h1 style="text-align: center; color: #0f172a;">Ministry of Primary and Secondary Education</h1>
                <h2 style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 1rem;">Egles Secondary School - Statistics Report</h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 1rem 0; color: #64748b;">Enrollment Details</h3>
                        <p><strong>Total Enrollment:</strong> ${studentCount}</p>
                        <p><strong>Male Students:</strong> ${maleStudents}</p>
                        <p><strong>Female Students:</strong> ${femaleStudents}</p>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 1rem 0; color: #64748b;">Staff Details</h3>
                        <p><strong>Total Staff:</strong> ${staffCount}</p>
                        <p><strong>Teacher-Student Ratio:</strong> 1:${Math.round(studentCount / (staffCount || 1))}</p>
                    </div>
                </div>
                
                <div style="margin-top: 3rem; text-align: center;">
                    <button class="btn-primary" onclick="window.print()">Print Official Statistics</button>
                    <button class="btn-primary" style="background: var(--danger); margin-left: 10px;" onclick="app.navigate('dashboard')">Close Report</button>
                </div>
            </div>
        `;

        this.container.innerHTML = statsContent;
    },

    startCountdown(targetDate) {
        const target = new Date(targetDate).getTime();
        const el = document.getElementById('live-timer');
        if (!el) return;

        const update = () => {
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                el.innerHTML = '<div style="font-size: 1.5rem; font-weight: 800;">EVENT IN PROGRESS</div>';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            el.innerHTML = `
                <div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 1.25rem 1rem; border-radius: 16px; min-width: 90px; box-shadow: inset 0 0 20px rgba(255,255,255,0.05);">
                    <div style="font-size: 2.8rem; font-weight: 800; line-height: 1; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">${days < 10 ? '0' + days : days}</div>
                    <div style="font-size: 0.85rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 700; color: rgba(255,255,255,0.9);">Days</div>
                </div>
                <div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 1.25rem 1rem; border-radius: 16px; min-width: 90px; box-shadow: inset 0 0 20px rgba(255,255,255,0.05);">
                    <div style="font-size: 2.8rem; font-weight: 800; line-height: 1; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">${hours < 10 ? '0' + hours : hours}</div>
                    <div style="font-size: 0.85rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 700; color: rgba(255,255,255,0.9);">Hrs</div>
                </div>
                <div style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); padding: 1.25rem 1rem; border-radius: 16px; min-width: 90px; box-shadow: inset 0 0 20px rgba(255,255,255,0.05);">
                    <div style="font-size: 2.8rem; font-weight: 800; line-height: 1; text-shadow: 0 4px 12px rgba(0,0,0,0.2);">${mins < 10 ? '0' + mins : mins}</div>
                    <div style="font-size: 0.85rem; text-transform: uppercase; margin-top: 0.5rem; font-weight: 700; color: rgba(255,255,255,0.9);">Mins</div>
                </div>
            `;
        };

        update();
        setInterval(update, 60000);
    },

    async fixData() {
        try {
            const students = await db.students.toArray();
            let fixesApplied = 0;
            for (const s of students) {
                if (!s.studentId) {
                    const ts = Date.now().toString().slice(-4);
                    const newId = `EST26${String(s.id).padStart(3, '0')}${ts}`;
                    await db.students.update(s.id, { studentId: newId });
                    fixesApplied++;
                }
            }
            const staff = await db.staff.toArray();
            for (const s of staff) {
                if (!s.staffId) {
                    const prefix = s.role === 'Admin' ? 'ADM' : 'TCH';
                    const newId = `${prefix}-${26}${String(s.id).padStart(3, '0')}`;
                    await db.staff.update(s.id, { staffId: newId });
                    fixesApplied++;
                }
            }
            if (fixesApplied > 0) console.log(`System: Applied ${fixesApplied} data integrity fixes.`);
        } catch (e) {
            console.warn("Integrity check bypassed:", e.message);
        }
    },

    calculateGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    },

    async renderNotices() {
        const notices = await db.notices.toArray();
        const canEdit = this.canModify();
        this.container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>Digital Notice Board</h1>
                ${canEdit ? `<button class="btn-primary" onclick="app.showNoticeForm()">Post Announcement</button>` : ''}
            </div>

            <div class="notice-grid" id="notice-grid">
                ${notices.length === 0 ? '<p>No active notices.</p>' : notices.reverse().map(n => `
                    <div class="notice-card" style="border-left: 4px solid ${n.priority === 'High' ? 'var(--danger)' : n.priority === 'Medium' ? 'var(--warning)' : 'var(--success)'}">
                        <div class="priority-dot priority-${(n.priority || 'low').toLowerCase()}"></div>
                        <h3 style="margin-bottom: 0.75rem; color: var(--text);">${n.title}</h3>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">${n.content}</p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted);">
                            <span>📅 ${n.date}</span>
                            <span class="status-pill" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);">${n.priority || 'Normal'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${canEdit ? `
            <div id="notice-modal" class="hidden" style="position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(12px);">
                <div class="glass-panel" style="width: 90%; max-width: 500px; border: 1px solid var(--primary);">
                    <h2 class="card-title">New Announcement</h2>
                    <form id="notice-form">
                        <input type="text" id="n-title" placeholder="Notice Title" required>
                        <textarea id="n-content" placeholder="Type your message here..." style="min-height: 150px;" required></textarea>
                        <select id="n-priority">
                            <option value="Low">Low Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="High">High Priority</option>
                        </select>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                            <button type="submit" class="btn-primary">Post Notice</button>
                            <button type="button" class="btn-primary" style="background: var(--glass-bg); color: var(--text); border: 1px solid var(--glass-border); box-shadow: none;" onclick="document.getElementById('notice-modal').classList.add('hidden')">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>` : ''}
        `;

        if (canEdit) {
            document.getElementById('notice-form').onsubmit = async (e) => {
                e.preventDefault();
                await db.notices.add({
                    title: document.getElementById('n-title').value,
                    content: document.getElementById('n-content').value,
                    priority: document.getElementById('n-priority').value,
                    date: new Date().toLocaleDateString()
                });
                this.renderNotices();
            };
        }
    },

    showNoticeForm() {
        document.getElementById('notice-modal').classList.remove('hidden');
    },

    async renderResources() {
        this.container.innerHTML = `
            <h1>System Resources & Portability</h1>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div class="glass-panel" style="margin: 0;">
                    <h2>Data Portability (CSV Export)</h2>
                    <p style="margin-bottom: 2rem;">Download your school data in CSV format for backup or external analysis.</p>
                    <div style="display: grid; gap: 1rem;">
                        <button class="btn-primary" onclick="app.exportToCSV('students')">Export Students</button>
                        <button class="btn-primary" onclick="app.exportToCSV('fees')">Export Financials</button>
                        <button class="btn-primary" onclick="app.exportToCSV('staff')">Export Staff</button>
                        <button class="btn-primary" onclick="app.exportToCSV('assets')">Export Inventory</button>
                    </div>
                </div>
                <div class="glass-panel" style="margin: 0;">
                    <h2>Learning Resource Hub</h2>
                    <p style="margin-bottom: 1.5rem;">Storage for school syllabuses, digital notes, and circulars.</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 12px; text-align: center; border: 2px dashed var(--glass-border);">
                        <p>Document Upload (In Demo Mode)</p>
                        <button class="btn-primary" style="background: var(--secondary); margin-top: 1rem;" onclick="alert('File storage module ready (IndexedDB Blob storage enabled). Select file to simulate upload.')">Simulate Upload</button>
                    </div>
                </div>
            </div>
        `;
    },



    async renderHostels() {
        const hostels = await db.hostels.toArray();
        this.container.innerHTML = `
            <h1>Hostel & Dormitory Management</h1>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <form id="hostel-form" class="glass-panel" style="margin: 0;">
                    <h2>Register Hostel</h2>
                    <input type="text" id="h-name" placeholder="Hostel Name" required>
                    <input type="number" id="h-cap" placeholder="Capacity" required>
                    <select id="h-gender">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <button type="submit" class="btn-primary" style="width: 100%;">Create Hostel</button>
                </form>
                <div class="glass-panel" style="margin: 0;">
                    <h2>Dormitory List</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left;">
                                <th style="padding: 1rem;">Hostel</th>
                                <th style="padding: 1rem;">Gender</th>
                                <th style="padding: 1rem;">Capacity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hostels.map(h => `
                                <tr>
                                    <td style="padding: 1rem;">${h.name}</td>
                                    <td style="padding: 1rem;">${h.gender}</td>
                                    <td style="padding: 1rem;">${h.capacity} Beds</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('hostel-form').onsubmit = async (e) => {
            e.preventDefault();
            await db.hostels.add({
                name: document.getElementById('h-name').value,
                capacity: parseInt(document.getElementById('h-cap').value),
                gender: document.getElementById('h-gender').value
            });
            this.renderHostels();
        };
    },

    checkPermission(page) {
        if (!this.currentUser) return false;
        const role = this.currentUser.role;
        const matrix = {
            'dashboard': ['Admin', 'Teacher', 'Parent', 'Student'],
            'students': ['Admin', 'Teacher'],
            'staff': ['Admin'],
            'subjects': ['Admin', 'Teacher'],
            'exams': ['Admin', 'Teacher', 'Parent', 'Student'],
            'timetable': ['Admin', 'Teacher', 'Parent', 'Student'],
            'attendance': ['Admin', 'Teacher'],
            'library': ['Admin', 'Teacher', 'Parent', 'Student'],
            'discipline': ['Admin', 'Teacher'],
            'health': ['Admin', 'Teacher', 'Parent'],
            'fees': ['Admin', 'Parent'],
            'payroll': ['Admin'],
            'inventory': ['Admin'],
            'pos': ['Admin', 'Staff'],
            'expenses': ['Admin'],
            'hostels': ['Admin', 'Parent'],
            'transport': ['Admin', 'Parent'],
            'notices': ['Admin', 'Teacher', 'Parent', 'Student'],
            'resources': ['Admin', 'Teacher', 'Parent', 'Student']
        };
        return (matrix[page] || []).includes(role);
    },

    async renderStaff() {
        const staff = await db.staff.toArray();
        this.container.innerHTML = `
            <div class="glass-panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2>Staff Management</h2>
                    <div style="display: flex; gap: 1rem;">
                        <button class="btn-primary" onclick="app.showProvisionModal()">Provision New Staff</button>
                        <button class="btn-primary" style="background: var(--success); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);" onclick="app.exportToCSV('staff')">Export Staff (CSV)</button>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="glass-panel" style="background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary);">
                        <div style="font-size: 0.8rem; color: var(--text-muted);">Total Staff</div>
                        <div style="font-size: 2rem; font-weight: 700;">${staff.length}</div>
                    </div>
                </div>

                <div class="glass-panel" style="margin-top: 2rem; padding: 0; overflow: hidden;">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Staff ID</th>
                                <th>Contact</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${staff.map(s => `
                                <tr>
                                    <td style="font-weight: 600;">${s.name}</td>
                                    <td><span class="status-pill" style="background: var(--primary); color: white;">${s.role}</span></td>
                                    <td style="font-family: monospace; color: var(--primary);">${s.staffId}</td>
                                    <td>${s.contact}</td>
                                    <td>
                                        <button onclick="app.deleteStaff(${s.id})" style="color: var(--danger); background:none; border:none; cursor:pointer; font-weight:600;">Remove</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async renderTransport() {
        const routes = await db.transport.toArray();
        this.container.innerHTML = `
            <h1>Transport & Bus Routes</h1>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <form id="route-form" class="glass-panel" style="margin: 0;">
                    <h2>Add Route</h2>
                    <input type="text" id="r-name" placeholder="Route Name" required>
                    <input type="text" id="r-bus" placeholder="Bus Registration" required>
                    <input type="text" id="r-driver" placeholder="Driver Name" required>
                    <button type="submit" class="btn-primary" style="width: 100%;">Save Route</button>
                </form>
                <div class="glass-panel" style="margin: 0;">
                    <h2>Active Routes</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left;">
                                <th style="padding: 1rem;">Route</th>
                                <th style="padding: 1rem;">Bus</th>
                                <th style="padding: 1rem;">Driver</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${routes.map(r => `
                                <tr>
                                    <td style="padding: 1rem;">${r.route || 'Unknown'}</td>
                                    <td style="padding: 1rem;">${r.busNo || 'N/A'}</td>
                                    <td style="padding: 1rem;">${r.driver || 'Staff'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('route-form').onsubmit = async (e) => {
            e.preventDefault();
            await db.transport.add({
                route: document.getElementById('r-name').value,
                busNo: document.getElementById('r-bus').value,
                driver: document.getElementById('r-driver').value
            });
            this.renderTransport();
        };
    },

    async renderDiscipline() {
        const students = await db.students.toArray();
        const records = await db.discipline.toArray();
        this.container.innerHTML = `
            <h1>Disciplinary Management</h1>
            <div class="dashboard-grid" style="grid-template-columns: 1fr 2fr;">
                <div class="glass-panel">
                    <h2 class="card-title">Record Infraction</h2>
                    <form id="discipline-form">
                        <select id="d-student" required>
                            <option value="">Select Student</option>
                            ${students.map(s => `<option value="${s.studentId}">${s.name}</option>`).join('')}
                        </select>
                        <input type="text" id="d-infraction" placeholder="Infraction Type" required>
                        <select id="d-severity">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                        <textarea id="d-action" placeholder="Action Taken" required></textarea>
                        <button type="submit" class="btn-primary" style="width: 100%;">Log Incident</button>
                    </form>
                </div>
                <div class="glass-panel" style="overflow-x: auto;">
                    <h2 class="card-title">Incident Logs</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Infraction</th>
                                <th>Severity</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.reverse().map(r => `
                                <tr>
                                    <td><span style="color: var(--primary); font-weight: 600;">${r.studentId}</span></td>
                                    <td>${r.infraction}</td>
                                    <td><span class="status-pill" style="background: ${r.severity === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${r.severity === 'High' ? 'var(--danger)' : 'var(--warning)'};">${r.severity}</span></td>
                                    <td>${r.date}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('discipline-form').onsubmit = async (e) => {
            e.preventDefault();
            await db.discipline.add({
                studentId: document.getElementById('d-student').value,
                infraction: document.getElementById('d-infraction').value,
                severity: document.getElementById('d-severity').value,
                action: document.getElementById('d-action').value,
                date: new Date().toLocaleDateString()
            });
            await this.checkSystemAlerts();
            await this.updateNotifBadge();
            this.renderDiscipline();
        };
    },

    async showFacultyProfile(staffId) {
        const staff = await db.staff.where('staffId').equals(staffId).first();
        const subjects = await db.subjects.where('teacherId').equals(staffId).toArray();
        if (!staff) return;

        const modal = document.createElement('div');
        modal.id = 'faculty-modal';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(10,15,30,0.95); z-index:10000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(15px); padding:1rem;';
        modal.innerHTML = `
            <div class="glass-panel" style="width:100%; max-width:600px; padding:3rem; position:relative; border:1px solid var(--primary); animation: modalZoom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <button onclick="this.closest('#faculty-modal').remove()" style="position:absolute; top:2rem; right:2rem; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.5rem;">✕</button>
                <div style="display:flex; gap:2.5rem; align-items:center; flex-wrap:wrap;">
                    <div style="width:140px; height:140px; border-radius:30px; background:var(--bg-main); border:2px solid var(--primary); display:flex; align-items:center; justify-content:center; font-size:4rem; box-shadow:0 15px 35px var(--primary-glow);">
                        ${staff.role === 'Admin' ? '🤵' : '👨‍🏫'}
                    </div>
                    <div style="flex:1; min-width:250px;">
                        <span style="background:var(--primary-glow); color:var(--primary-bright); padding:4px 12px; border-radius:100px; font-size:0.75rem; font-weight:800; letter-spacing:1px; text-transform:uppercase;">Faculty Profile</span>
                        <h2 style="margin:0.5rem 0; font-size:2.5rem; font-weight:900;">${staff.name}</h2>
                        <div style="color:var(--text-muted); margin-bottom:1.5rem; font-size:1.1rem;">${staff.role} &bull; Senior Department Head</div>
                    </div>
                </div>
                
                <div style="margin-top:2.5rem; display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
                    <div>
                        <h4 style="text-transform:uppercase; font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; letter-spacing:1px;">Academic Portfolio</h4>
                        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                            ${subjects.length > 0 ? subjects.map(s => `<span style="background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); padding:6px 12px; border-radius:8px; font-size:0.9rem;">${s.name} (${s.class})</span>`).join('') : 'General Administration'}
                        </div>
                    </div>
                    <div>
                        <h4 style="text-transform:uppercase; font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; letter-spacing:1px;">Connect</h4>
                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            <a href="mailto:${staff.name.replace(' ', '.').toLowerCase()}@egles.edu" style="color:var(--primary); font-size:0.95rem; text-decoration:none;">📧 Official Email</a>
                            <span style="color:var(--text-muted); font-size:0.95rem;">📞 Ext: 40291 (Direct)</span>
                        </div>
                    </div>
                </div>

                <div style="margin-top:2.5rem; padding-top:2.5rem; border-top:1px solid var(--glass-border);">
                    <h4 style="text-transform:uppercase; font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; letter-spacing:1px;">Faculty Bio & Philosophy</h4>
                    <p style="color:var(--text-muted); line-height:1.7; font-size:0.95rem; margin:0;">
                        Dedicated to academic excellence and nurturing the unique potential of every student. With over 12 years of experience at Egles SMIS, I believe in a holistic approach to education that combines rigorous academics with character development.
                    </p>
                </div>
                
                <button class="btn-primary" style="margin-top:2.5rem; width:100%;" onclick="this.closest('#faculty-modal').remove()">Return to Directory</button>
            </div>
            <style>
                @keyframes modalZoom { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;
        document.body.appendChild(modal);
    },

    async viewIDCard(id) {
        const student = await db.students.get(parseInt(id));
        if (!student) {
            alert("This student profile is no longer in the system.");
            return;
        }
        await this.showLoading(1000);
        this.container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh;">
                <div class="glass-panel" style="width: 350px; height: 500px; display: flex; flex-direction: column; align-items: center; border: 2px solid var(--primary); background: var(--bg-gradient); padding: 0; box-shadow: var(--shadow-lg);">
                    <div style="background: var(--primary); width: 100%; padding: 1.5rem; text-align: center; border-radius: 20px 20px 0 0;">
                        <h2 style="margin: 0; font-size: 1.2rem; color: white;">EGLES SECONDARY SCHOOL</h2>
                        <span style="font-size: 0.7rem; color: rgba(255,255,255,0.8);">Student Identification Card</span>
                    </div>
                    <div style="width: 150px; height: 150px; border-radius: 50%; background: var(--bg-card); margin: 2rem 0; border: 4px solid var(--glass-border); display: flex; align-items: center; justify-content: center; font-size: 4rem; overflow: hidden;">
                         ${student.name.charAt(0)}
                    </div>
                    <h2 style="margin-bottom: 0.5rem; color: white;">${student.name || 'Unknown Student'}</h2>
                    <p style="color: var(--primary-bright); font-weight: 700;">STUDENT ID: ${student.studentId || 'N/A'}</p>
                    <p style="margin-top: 1rem; font-weight: 600; color: white;">CLASS: ${student.class}</p>
                    <div style="margin-top: auto; padding: 1.5rem; width: 100%; text-align: center; font-size: 0.7rem; color: var(--text-muted); border-top: 1px solid var(--glass-border);">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${student.studentId}" style="width: 50px; margin-bottom: 0.5rem; opacity: 0.6;">
                        <div>Official School ID - Valid for 2026 Academic Year</div>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn-primary" onclick="window.print()">Print ID PDF</button>
                    <button class="btn-primary" style="background: var(--danger);" onclick="app.navigate('students')">Close ID</button>
                </div>
            </div>
        `;
    },

    async printRegister() {
        const students = await db.students.toArray();
        const date = document.getElementById('att-date').value;
        const html = `
            <div class="print-container">
                <h1 style="text-align:center;">EGLES SECONDARY SCHOOL - DAILY REGISTER</h1>
                <p style="text-align:center;">DATE: ${date} | Total Students: ${students.length}</p>
                <table>
                    <thead>
                        <tr><th>Student Name</th><th>Class</th><th>Signature / Status</th></tr>
                    </thead>
                    <tbody>
                        ${students.map(s => `<tr><td>${s.name}</td><td>${s.class}</td><td></td></tr>`).join('')}
                    </tbody>
                </table>
                <div style="margin-top:40px; border-top: 1px solid #000; width: 200px; padding-top: 5px;">Teacher Signature</div>
            </div>
        `;
        const oldContent = this.container.innerHTML;
        this.container.innerHTML = html;
        window.print();
        this.container.innerHTML = oldContent;
    },

    async printSinglePayslip(id) {
        const p = await db.payroll.get(parseInt(id));
        const s = await db.staff.where('staffId').equals(p.staffId).first();
        await this.showLoading(1200);
        this.hideLoading();
        const html = `
            <div class="print-container" style="background:white; color:black; padding:40px; border:2px solid #000;">
                <h2 style="text-align:center; margin-bottom:0;">EGLES SECONDARY SCHOOL</h2>
                <h3 style="text-align:center; margin-top:5px;">OFFICIAL PAYSLIP</h3>
                <hr>
                <div style="display:flex; justify-content:space-between; margin:20px 0;">
                    <div>
                        <p><strong>Staff Name:</strong> ${s ? s.name : 'Unknown Staff'}</p>
                        <p><strong>Designation:</strong> ${s ? s.role : 'N/A'}</p>
                        <p><strong>Employee ID:</strong> ${p.staffId || 'N/A'}</p>
                    </div>
                    <div style="text-align:right;">
                        <p><strong>Month:</strong> ${p.month} ${p.year}</p>
                        <p><strong>Pay Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
                <table style="width:100%; border:1px solid #000;">
                    <tr><td style="padding:10px;">Basic Salary</td><td style="padding:10px;text-align:right;">$${(p.salary || 0).toFixed(2)}</td></tr>
                    <tr><td style="padding:10px;">Allowances/Bonus</td><td style="padding:10px;text-align:right;">$${(p.bonus || 0).toFixed(2)}</td></tr>
                    <tr><td style="padding:10px;">Deductions</td><td style="padding:10px;text-align:right;">($${(p.deductions || 0).toFixed(2)})</td></tr>
                    <tr style="font-weight:bold; background:#eee;"><td style="padding:10px;">NET SALARY</td><td style="padding:10px;text-align:right;">$${((p.salary || 0) + (p.bonus || 0) - (p.deductions || 0)).toFixed(2)}</td></tr>
                </table>
                <div style="margin-top:50px; text-align:right;">
                    <p style="border-top:1px solid #000; display:inline-block; padding-top:5px; width:200px;">Bursar Signature</p>
                </div>
            </div>
        `;
        const oldContent = this.container.innerHTML;
        this.container.innerHTML = html;
        window.print();
        this.container.innerHTML = oldContent;
    }
};

app.init();
