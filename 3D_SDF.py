import moderngl_window as mglw


class Main(mglw.WindowConfig):
    window_size = 1440, 900
    resource_dir = 'shaders'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.quad = mglw.geometry.quad_fs()
        self.program = self.load_program(vertex_shader='main.vert', fragment_shader='main.frag')
        # uniforms
        self.program['u_resolution'] = self.window_size

    def render(self, time, frame_time):
        self.ctx.clear()
        #self.program['u_time'] = time
        self.quad.render(self.program)

    def mouse_position_event(self, x, y, dx, dy):
        self.program['u_mouse'] = (x, y)


if __name__ == '__main__':
    mglw.run_window_config(Main)
